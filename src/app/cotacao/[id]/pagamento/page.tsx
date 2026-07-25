'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { NotchSection } from '@/components/home/NotchSection';
import { Loader2, AlertCircle, CheckCircle2, Smartphone, Landmark } from 'lucide-react';
import { MPESA_NUMBER, BANK_NAME, BANK_ACCOUNT, BANK_NIB } from '@/lib/quotation-payment-info';
import { formatMt } from '@/lib/pricing-catalog';
import { Spinner } from '@/components/ui/spinner';
import { computeBatchStatus } from '@/lib/quotation-status-labels';

type Mode = 'advance' | 'remainder' | 'unavailable';

export default function CotacaoPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [metodo, setMetodo] = useState<'mpesa' | 'transferencia' | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [sobConsulta, setSobConsulta] = useState(false);
  const [totalMt, setTotalMt] = useState(0);
  const [someSobConsulta, setSomeSobConsulta] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: row } = await supabase.from('quotation_requests').select('batch_id, sob_consulta, status').eq('id', id).single();
      if (!row) {
        setMode('unavailable');
        return;
      }
      const { data: siblings } = await supabase
        .from('quotation_requests')
        .select('sob_consulta, total_mt, status')
        .eq('batch_id', row.batch_id);
      const items: { sob_consulta: boolean; total_mt: number | null; status: string }[] =
        siblings && siblings.length > 0 ? siblings : [{ sob_consulta: row.sob_consulta, total_mt: null, status: row.status }];

      const aggregate = computeBatchStatus(items);
      setMode(aggregate === 'pending' ? 'advance' : aggregate === 'delivered' ? 'remainder' : 'unavailable');
      setSobConsulta(items.every((i) => i.sob_consulta));
      setSomeSobConsulta(items.some((i) => i.sob_consulta));
      setTotalMt(items.reduce((sum, i) => sum + (i.sob_consulta ? 0 : (i.total_mt || 0)), 0));
    })();
  }, [id]);

  const isRemainder = mode === 'remainder';
  const valorAPagar = Math.round(totalMt * (isRemainder ? 0.3 : 0.7) * 100) / 100;

  const handleConfirm = async () => {
    if (!metodo) return;
    setStatus('submitting');
    setErrorMessage('');
    try {
      const endpoint = isRemainder ? 'pagamento-remanescente' : 'pagamento';
      const res = await fetch(`/api/cotacoes/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPagamento: metodo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível confirmar o método de pagamento.');
      }
      setStatus('done');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao comunicar com o servidor.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-200 dark:bg-black">
      <NotchSection shape="start" bg="bg-gradient-to-br from-black via-zinc-900 to-zinc-950" first>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto max-w-7xl px-6 pt-[170px] pb-[70px] relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Método de Pagamento</h1>
          <p className="text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-4">
            {isRemainder
              ? 'Escolha como pretende pagar o remanescente (30%) para levantar a encomenda.'
              : 'Escolha como pretende fazer o adiantamento de 70% da cotação.'}
          </p>
          <nav className="text-xs text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <span className="mx-2">/</span>
            <Link href="/precos" className="hover:text-white transition-colors">Preços</Link>
            <span className="mx-2">/</span>
            <Link href={`/cotacao/${id}`} className="hover:text-white transition-colors">Cotação</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">Pagamento</span>
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-zinc-500 to-transparent" />
          <div className="h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />
        </div>
      </NotchSection>

      <NotchSection shape="mid" bg="bg-zinc-200 dark:bg-black" className="py-12">
      <div className="max-w-lg mx-auto px-4">

        {mode === null ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : mode === 'unavailable' ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Nada para pagar neste momento</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Esta encomenda não tem um pagamento pendente agora. Consulte o estado actual no seu painel.
            </p>
            <Link
              href="/encomendas"
              className="inline-block mt-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-md text-sm transition-colors"
            >
              Ir para as Minhas Encomendas
            </Link>
          </div>
        ) : mode === 'advance' && sobConsulta ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Este serviço é Sob Consulta</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ainda não há um valor fixo para pagar. A nossa equipa vai contactá-lo para confirmar o valor antes de avançar para o pagamento.
            </p>
            <Link
              href={`/cotacao/${id}`}
              className="inline-block mt-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-md text-sm transition-colors"
            >
              Voltar à Cotação
            </Link>
          </div>
        ) : status === 'done' ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Método registado!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isRemainder
                ? 'A nossa equipa vai confirmar o pagamento e preparar a entrega/levantamento.'
                : 'A nossa equipa vai confirmar o pagamento assim que o depósito for recebido.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/encomendas')}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-md text-sm transition-colors"
            >
              Ir para as Minhas Encomendas
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isRemainder ? 'Remanescente a pagar (30%)' : 'Adiantamento a pagar (70%)'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatMt(valorAPagar)} MT</p>
              {someSobConsulta && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Não inclui os itens Sob Consulta desta encomenda — o valor desses é confirmado à parte.
                </p>
              )}
            </div>

            {status === 'error' && errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMetodo('mpesa')}
              className={`w-full text-left flex items-start gap-4 p-5 rounded-lg border transition-colors ${
                metodo === 'mpesa'
                  ? 'border-red-600 bg-red-50 dark:bg-red-950/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-300'
              }`}
            >
              <Smartphone className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">M-Pesa</p>
                {metodo === 'mpesa' && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Envie o valor para <span className="font-bold">{MPESA_NUMBER}</span>.
                  </p>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMetodo('transferencia')}
              className={`w-full text-left flex items-start gap-4 p-5 rounded-lg border transition-colors ${
                metodo === 'transferencia'
                  ? 'border-red-600 bg-red-50 dark:bg-red-950/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-300'
              }`}
            >
              <Landmark className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">Transferência Bancária</p>
                {metodo === 'transferencia' && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 space-y-0.5">
                    <p>{BANK_NAME}</p>
                    <p>Conta BCI: <span className="font-bold">{BANK_ACCOUNT}</span></p>
                    <p>NIB: <span className="font-bold">{BANK_NIB}</span></p>
                  </div>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!metodo || status === 'submitting'}
              className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-md transition-all shadow-lg shadow-red-600/20"
            >
              {status === 'submitting' ? (
                <>
                  <Spinner className="w-4 h-4" />
                  <span>A confirmar...</span>
                </>
              ) : (
                <span>Confirmar Método de Pagamento</span>
              )}
            </button>
          </div>
        )}
      </div>
      </NotchSection>
    </div>
  );
}
