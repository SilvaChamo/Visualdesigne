import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveQuotationAccess } from '@/lib/quotation-access';
import { ensureQuotationAttachmentsBucket, QUOTATION_ATTACHMENTS_BUCKET, getAttachmentSignedUrl, getAttachmentSignedUrls } from '@/lib/quotation-attachments-bucket';
import { compressImageToMaxSize } from '@/lib/image-compress';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, mesmo limite por omissão de MultiFileUpload

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveQuotationAccess(id);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('quotation_attachments')
    .select('*')
    .in('quotation_id', access.batchQuotationIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[cotacoes/[id]/anexos] list error:', error);
    return NextResponse.json({ error: 'Não foi possível carregar os anexos.' }, { status: 500 });
  }

  // #11: bucket privado — file_url guardado é só o caminho.
  const signedUrls = await getAttachmentSignedUrls((data || []).map((a) => a.file_url));
  const anexos = (data || []).map((a, idx) => ({ ...a, file_url: signedUrls[idx] }));

  return NextResponse.json({ success: true, anexos });
}

// Upload directo (não passa por /api/storage-upload, que não valida dono
// nenhum) — o ownership check acontece aqui, antes de qualquer escrita.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveQuotationAccess(id);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Ficheiro em falta.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Ficheiro demasiado grande (máx. 10MB).' }, { status: 400 });
  }

  await ensureQuotationAttachmentsBucket();

  const ext = file.name.split('.').pop() || 'bin';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const safeName = baseName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const path = `${id}/${Date.now()}-${safeName}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { buffer, contentType } = await compressImageToMaxSize(
    Buffer.from(bytes),
    file.type || 'application/octet-stream'
  );

  const { data: uploadData, error: uploadError } = await admin.storage
    .from(QUOTATION_ATTACHMENTS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[cotacoes/[id]/anexos] upload error:', uploadError);
    return NextResponse.json({ error: 'Não foi possível enviar o ficheiro.' }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await admin
    .from('quotation_attachments')
    .insert({
      quotation_id: id,
      uploaded_by_role: access.role,
      file_name: file.name,
      file_url: uploadData.path,
      file_size_bytes: buffer.length,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[cotacoes/[id]/anexos] insert error:', insertError);
    return NextResponse.json({ error: 'Não foi possível registar o anexo.' }, { status: 500 });
  }

  const signedUrl = await getAttachmentSignedUrl(inserted.file_url);
  return NextResponse.json({ success: true, anexo: { ...inserted, file_url: signedUrl } });
}
