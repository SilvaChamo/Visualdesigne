import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { checkAvailability, dynadotAPI, mapProfileToDynadotContact } from '@/lib/dynadot-adapter';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;

  try {
    const { domain, agreeToTerms } = await req.json();

    if (!domain) {
      return NextResponse.json({ status: 'ERROR', message: 'Domínio não fornecido' }, { status: 400 });
    }

    if (!agreeToTerms) {
      return NextResponse.json(
        { success: false, error: 'Tem de aceitar os termos do registrador para registar.' },
        { status: 400 }
      );
    }

    const clean = String(domain).toLowerCase().trim();

    // 1. Verificar disponibilidade real via Dynadot
    const check = await checkAvailability(clean);
    if (!check.available) {
      return NextResponse.json(
        { success: false, error: check.error || 'Este domínio já não se encontra disponível para registo.' },
        { status: 400 }
      );
    }

    // 2. Obter dados do perfil do utilizador na BD
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', auth.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[API] Erro ao carregar perfil do utilizador:', profileError);
    }

    // 3. Mapear perfil para dados de contacto WHOIS da Dynadot
    const contactData = mapProfileToDynadotContact(profile, auth.user.email || '');
    console.log('[API] Criando contacto WHOIS na Dynadot com dados:', contactData);

    // 4. Criar contacto na Dynadot
    const contactResult = await dynadotAPI.createContact(contactData);
    if (!contactResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao registar contacto WHOIS: ${contactResult.error}`
        },
        { status: 400 }
      );
    }

    console.log(`[API] Contacto WHOIS criado com sucesso. ID: ${contactResult.contactId}`);

    // 5. Registar domínio utilizando o ID de contacto criado
    console.log(`[API] Iniciando compra do domínio ${clean} na Dynadot...`);
    const registerResult = await dynadotAPI.registerDomain(clean, contactResult.contactId, 1, true);

    if (registerResult.success) {
      return NextResponse.json({
        success: true,
        message: `Domínio ${clean} registado com sucesso!`,
        raw: registerResult.raw,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: registerResult.error || 'Erro ao registar o domínio. Verifique o saldo ou os limites do serviço de registo.',
        raw: registerResult.raw,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Domain Register Error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
  }
}
