// Dados de pagamento manual (M-Pesa/transferência bancária), partilhados
// entre /cotacao/[id]/pagamento (escolha de método) e a secção "Pagamentos"
// de /encomendas (estado + instruções). Um único sítio para não arriscar
// divergência silenciosa se a conta mudar.
export const MPESA_NUMBER = '+258 85 73 96 739';
export const BANK_NAME = 'VisualDesign, Lda.';
export const BANK_ACCOUNT = '13705644210001';
export const BANK_NIB = '0008.0000.370570564421.0195';

export function metodoPagamentoLabel(m: string | null | undefined): string {
  if (m === 'mpesa') return 'M-Pesa';
  if (m === 'transferencia') return 'Transferência Bancária';
  return '—';
}
