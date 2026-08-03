import { sendEmail } from '@/lib/email-service';
import { emailHeader, emailGreeting, emailFooter, wrapContentInFrame } from '@/lib/renewal-templates';
import { formatMt } from '@/lib/pricing-catalog';

const SUPPORT_EMAIL = 'suporte@visualdesignmoz.com';
const SUPPORT_PHONE = '+258 85 242 5525';
const COMPANY_NAME = 'VisualDesign';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://visualdesignmoz.com';
// noreply propositado — estas notificações nunca esperam resposta por email,
// só servem para levar o cliente de volta ao painel (conversa/estado ficam lá).
const NOREPLY_EMAIL = 'noreply@visualdesignmoz.com';

const APPROVAL_NOTICE =
  'Brevemente irá receber layouts de design para aprovação, de forma a avançarmos com a produção. ' +
  'É importante responder a esses pedidos de aprovação o mais rápido possível — atrasos nas aprovações ' +
  'podem comprometer o prazo de entrega combinado.';

function buildClientEmailHtml(params: {
  clientName: string;
  title: string;
  message: string;
  ctaLink?: string;
  ctaText?: string;
}) {
  const { clientName, title, message, ctaLink, ctaText } = params;

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">${title}</h2>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-line;">${message}</p>
    ${ctaLink ? `<p style="margin: 20px 0 0 0;"><a href="${ctaLink}" style="display: inline-block; padding: 10px 20px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px;">${ctaText || 'Aceder à plataforma'}</a></p>` : ''}
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Exo 2', sans-serif; background: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${emailHeader(COMPANY_NAME)}
    <tr>
      <td align="center" style="padding: 24px 12px; background: #f3f4f6;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border: 1px solid #e5e7eb;">
          <tr><td>${emailGreeting(clientName)}</td></tr>
          <tr><td style="padding: 20px 24px;">${wrapContentInFrame(body, 'low')}</td></tr>
          <tr><td>${emailFooter(SUPPORT_EMAIL, SUPPORT_PHONE, COMPANY_NAME)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Avisa o cliente (email) quando a equipa aprova ou rejeita a sua encomenda
 * (quotation_requests). Isolado em try/catch — uma falha de email nunca deve
 * impedir a actualização de estado no dashboard.
 */
export async function notifyQuoteClientStatusChange(params: {
  to: string;
  clientName: string;
  produto: string;
  status: 'approved' | 'rejected' | 'delivered' | 'done';
  rejectionReason?: string | null;
}) {
  const { to, clientName, produto, status, rejectionReason } = params;

  const title = {
    approved: 'A sua encomenda foi aprovada',
    rejected: 'Actualização sobre a sua encomenda',
    delivered: 'A sua encomenda está concluída',
    done: 'A sua encomenda foi entregue',
  }[status];

  const message = {
    approved: `A sua encomenda "${produto}" foi aprovada e a produção vai avançar.\n\n${APPROVAL_NOTICE}`,
    rejected: `A sua encomenda "${produto}" não foi aprovada neste momento.${
      rejectionReason ? `\n\nMotivo: ${rejectionReason}` : ''
    }\n\nEntre em contacto connosco se tiver dúvidas.`,
    delivered: `A sua encomenda "${produto}" está concluída e pronta para levantamento. Falta apenas confirmar o pagamento do remanescente para avançarmos com a entrega.`,
    done: `A sua encomenda "${produto}" foi entregue com sucesso. Obrigado por escolher a VisualDesign!`,
  }[status];

  try {
    await sendEmail({
      to,
      subject: title,
      html: buildClientEmailHtml({ clientName, title, message }),
      from: NOREPLY_EMAIL,
      category: 'transactional',
    });
  } catch (err) {
    console.error('[notify-quote-client] falha ao enviar email ao cliente:', err);
  }
}

/**
 * Avisa o cliente (email) quando a equipa responde a uma mensagem sobre a
 * sua encomenda (quotation_messages). Isolado em try/catch, mesmo padrão de
 * notifyQuoteClientStatusChange.
 */
export async function notifyQuoteClientNewMessage(params: {
  to: string;
  clientName: string;
  produto: string;
  quotationId: string;
}) {
  const { to, clientName, produto, quotationId } = params;
  const title = 'Nova mensagem sobre a sua encomenda';
  const body = `A equipa respondeu sobre a sua encomenda "${produto}". Aceda à plataforma para ver a conversa completa e responder.`;
  const ctaLink = `${SITE_URL}/encomendas?section=mensagens&quotationId=${quotationId}`;

  try {
    await sendEmail({
      to,
      subject: title,
      html: buildClientEmailHtml({ clientName, title, message: body, ctaLink, ctaText: 'Ver conversa' }),
      from: NOREPLY_EMAIL,
      category: 'transactional',
    });
  } catch (err) {
    console.error('[notify-quote-client] falha ao enviar email de nova mensagem:', err);
  }
}

/**
 * Avisa o cliente (email) quando a equipa define o valor de um item que
 * tinha sido submetido como "Sob Consulta" (sem preço fixo no catálogo, ou
 * pedido personalizado). O painel do cliente já mostra o valor assim que a
 * linha é actualizada — este email só avisa que há resposta à espera.
 */
export async function notifyQuoteClientPriceDefined(params: {
  to: string;
  clientName: string;
  produto: string;
  valorMt: number;
}) {
  const { to, clientName, produto, valorMt } = params;
  const title = 'Valor definido para o seu pedido sob consulta';
  const message = `A equipa definiu o valor para o pedido "${produto}": ${formatMt(valorMt)} MT.\n\nAceda ao painel para ver os detalhes e avançar com o pagamento.`;

  try {
    await sendEmail({
      to,
      subject: title,
      html: buildClientEmailHtml({ clientName, title, message }),
      from: NOREPLY_EMAIL,
      category: 'transactional',
    });
  } catch (err) {
    console.error('[notify-quote-client] falha ao enviar email de valor definido:', err);
  }
}

/**
 * Avisa o cliente (email) quando a equipa envia um novo layout de design
 * para aprovação (quotation_layouts). Assunto inclui a descrição e a fase,
 * para o cliente identificar de imediato do que se trata.
 */
export async function notifyQuoteClientNewLayout(params: {
  to: string;
  clientName: string;
  produto: string;
  descricao: string;
  fase: number;
}) {
  const { to, clientName, produto, descricao, fase } = params;
  const title = `Novo layout enviado: ${descricao} — Fase ${fase}`;
  const body = `A equipa enviou um novo layout para a sua encomenda "${produto}":\n\nFase ${fase} — ${descricao}\n\nEntre no painel para ver e descarregar.`;

  try {
    await sendEmail({
      to,
      subject: title,
      html: buildClientEmailHtml({ clientName, title, message: body }),
      from: NOREPLY_EMAIL,
      category: 'transactional',
    });
  } catch (err) {
    console.error('[notify-quote-client] falha ao enviar email de novo layout:', err);
  }
}
