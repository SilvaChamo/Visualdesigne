'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2, CheckCircle2, XCircle, Clock, HelpCircle, Server } from 'lucide-react';
import { panelBtnPrimary, panelBtnSecondary, panelField } from '@/lib/panel-ui';
import { Spinner } from '@/components/ui/spinner';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { readListCache, writeListCache } from '@/lib/panel-list-cache';

const TRANSFER_CACHE_KEY = 'vd_domain_transfer_requests_v1';

type TransferRequest = {
  id: string;
  domain_name: string;
  status: 'pending' | 'submitted' | 'waiting' | 'completed' | 'rejected' | 'failed';
  error_message?: string | null;
  created_at: string;
};

const STATUS_META: Record<
  TransferRequest['status'],
  { label: string; subtitle?: string; icon: typeof Clock; className: string; pulse?: boolean }
> = {
  pending: { label: 'A processar pagamento', icon: Clock, className: 'text-gray-500' },
  submitted: {
    label: 'Pedido enviado ao registador',
    subtitle: 'Processo a decorrer — pode demorar alguns dias. Vai receber um aviso assim que terminar.',
    icon: Clock,
    className: 'text-amber-600',
    pulse: true,
  },
  waiting: {
    label: 'À espera de aprovação do registador anterior',
    subtitle: 'Processo a decorrer — pode demorar alguns dias. Vai receber um aviso assim que terminar.',
    icon: Clock,
    className: 'text-amber-600',
    pulse: true,
  },
  completed: { label: 'Concluída — domínio já é seu', icon: CheckCircle2, className: 'text-green-600' },
  rejected: { label: 'Rejeitada pelo registador anterior', icon: XCircle, className: 'text-red-600' },
  failed: { label: 'Falhou ao submeter — contacte o suporte', icon: XCircle, className: 'text-red-600' },
};

const TRANSFER_STEPS = [
  'Pede-se a transferência com o código de autorização (EPP) do registador actual.',
  'O registador anterior recebe o pedido e tem de aprovar — ou passar 5 a 7 dias sem responder, o que conta como aprovação silenciosa.',
  'Assim que aprovado, o domínio passa a ser gerido por nós e fica logo activo na sua conta.',
];

type DnsSnapshot = { domain: string; nameservers: string[]; mailExchangers: string[] } | null;

function DnsSnapshotCard({ domain }: { domain: string }) {
  const [snapshot, setSnapshot] = useState<DnsSnapshot>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/domain-transfer/dns-snapshot?domain=${encodeURIComponent(domain)}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) setSnapshot(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  return (
    <div className="rounded border border-gray-200 p-3 dark:border-zinc-800">
      <p className="mb-2 truncate font-mono text-xs font-bold text-gray-900 dark:text-zinc-100">{domain}</p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" /> A consultar DNS...
        </div>
      ) : !snapshot || (snapshot.nameservers.length === 0 && snapshot.mailExchangers.length === 0) ? (
        <p className="text-xs text-gray-400 dark:text-zinc-500">Sem resposta de DNS neste momento.</p>
      ) : (
        <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-zinc-400">
          {snapshot.nameservers.length > 0 && (
            <div>
              <p className="font-bold uppercase tracking-tight text-gray-500 dark:text-zinc-500">Nameservers</p>
              {snapshot.nameservers.map((ns) => (
                <p key={ns} className="truncate font-mono">{ns}</p>
              ))}
            </div>
          )}
          {snapshot.mailExchangers.length > 0 && (
            <div>
              <p className="font-bold uppercase tracking-tight text-gray-500 dark:text-zinc-500">Email (MX)</p>
              {snapshot.mailExchangers.map((mx) => (
                <p key={mx} className="truncate font-mono">{mx}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DomainTransferSection() {
  const { addItem, setIsCartOpen } = useCart();
  const { formatPrice } = useCurrency();

  const [domain, setDomain] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [transferPriceMt, setTransferPriceMt] = useState<number | null>(null);
  const [validatedDomain, setValidatedDomain] = useState('');

  const [requests, setRequests] = useState<TransferRequest[]>(() => readListCache<TransferRequest[]>(TRANSFER_CACHE_KEY) ?? []);
  const [loadingRequests, setLoadingRequests] = useState(() => readListCache<TransferRequest[]>(TRANSFER_CACHE_KEY) === null);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/domain-transfer', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.pedidos || []);
        writeListCache(TRANSFER_CACHE_KEY, data.pedidos || []);
      }
    } catch {
      /* lista fica vazia */
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  // Pedidos ainda em curso (submitted/waiting) são revalidados contra a Dynadot
  // de vez em quando — a aprovação acontece do lado do registador antigo, fora
  // do nosso controlo, por isso não há outra forma de saber que mudou.
  useEffect(() => {
    const pending = requests.filter((r) => r.status === 'submitted' || r.status === 'waiting');
    if (pending.length === 0) return;
    const interval = setInterval(() => {
      Promise.all(
        pending.map((r) =>
          fetch(`/api/domain-transfer/status?domain=${encodeURIComponent(r.domain_name)}`, { credentials: 'include' }).catch(() => null),
        ),
      ).then(() => void loadRequests());
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests.map((r) => r.status).join(',')]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !authCode.trim()) return;
    setLoading(true);
    setMsg('');
    setTransferPriceMt(null);
    try {
      const clean = domain.trim().toLowerCase();
      const res = await fetch('/api/domain-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: clean, tld: '' }),
      });
      const data = await res.json();

      if (data.error) {
        setMsgOk(false);
        setMsg(data.error);
        return;
      }
      if (data.available) {
        setMsgOk(false);
        setMsg('Este domínio está livre — ninguém o possui, por isso não há nada para transferir. Registe-o directamente em vez de transferir.');
        return;
      }

      const pricesRes = await fetch('/api/domain-tld-prices');
      const pricesData = await pricesRes.json();
      const tld = (pricesData.prices || []).find((t: { value: string }) => clean.endsWith(t.value));
      if (!tld) {
        setMsgOk(false);
        setMsg('Não reconhecemos esta extensão de domínio.');
        return;
      }

      const priceMt = Math.round(tld.transfer * 65 * 1.5 * 1.075);
      setTransferPriceMt(priceMt);
      setValidatedDomain(clean);
      setMsgOk(true);
      setMsg(`Domínio ${clean} confirmado como registado noutro lado — pronto para pedir a transferência.`);
    } catch (e: unknown) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : 'Erro ao validar domínio.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!validatedDomain || transferPriceMt === null) return;
    addItem({
      id: validatedDomain,
      type: 'domain',
      name: validatedDomain,
      price: transferPriceMt,
      period: 1,
      authCode: authCode.trim(),
    });
    setIsCartOpen(true);
    setDomain('');
    setAuthCode('');
    setTransferPriceMt(null);
    setValidatedDomain('');
    setMsg('');
  };

  const pendingRequests = requests.filter((r) => r.status === 'submitted' || r.status === 'waiting');

  return (
    <div className="w-full gap-5 lg:flex lg:items-start">
      <div className="min-w-0 flex-1 space-y-5">
      <div className="w-full rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 dark:border-zinc-700">
            <ArrowRightLeft className="h-5 w-5 text-gray-600 dark:text-zinc-400" />
          </div>
          <div className="space-y-1 text-sm text-gray-600 dark:text-zinc-400">
            <p>Introduza o domínio e o código de autorização (EPP) do registador actual.</p>
            <p>O domínio permanece activo durante a transferência. O registador anterior pode demorar alguns dias a aprovar.</p>
          </div>
        </div>

        <div className="-mx-5 mb-5 border-b border-gray-200 dark:border-zinc-700" aria-hidden="true" />

        <form onSubmit={handleValidate} className="space-y-4">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">Domínio</label>
              <input
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setTransferPriceMt(null) }}
                placeholder="exemplo.com"
                className={`${panelField} w-full font-mono`}
                required
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">
                Código de autorização (EPP)
              </label>
              <input
                value={authCode}
                onChange={(e) => { setAuthCode(e.target.value); setTransferPriceMt(null) }}
                placeholder="Código do registador actual"
                className={`${panelField} w-full font-mono`}
                required
              />
            </div>
          </div>

          {msg && (
            <div
              className={`rounded border px-4 py-3 text-sm ${
                msgOk
                  ? 'border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
              }`}
            >
              {msg}
              {msgOk && transferPriceMt !== null && (
                <p className="mt-1 font-bold">Preço da transferência: {formatPrice(transferPriceMt)}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {transferPriceMt !== null ? (
              <button type="button" onClick={handleAddToCart} className={panelBtnPrimary}>
                <ArrowRightLeft className="h-4 w-4" /> Adicionar ao carrinho — {formatPrice(transferPriceMt)}
              </button>
            ) : (
              <button type="submit" disabled={loading || !domain.trim() || !authCode.trim()} className={panelBtnPrimary}>
                {loading ? <Spinner className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                Validar domínio
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDomain('');
                setAuthCode('');
                setMsg('');
                setTransferPriceMt(null);
              }}
              className={panelBtnSecondary}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      <div className="w-full rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-bold uppercase text-gray-500 dark:text-zinc-500">As suas transferências</h3>
        {loadingRequests ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500">Ainda não pediu nenhuma transferência.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded border px-4 py-3 ${
                    meta.pulse
                      ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                      : 'border-gray-100 dark:border-zinc-800'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold text-gray-900 dark:text-zinc-100">{r.domain_name}</p>
                    {r.status === 'failed' && r.error_message && (
                      <p className="mt-0.5 text-xs text-red-500">{r.error_message}</p>
                    )}
                    {meta.subtitle && (
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{meta.subtitle}</p>
                    )}
                  </div>
                  <div className={`flex shrink-0 items-center gap-1.5 text-xs font-bold ${meta.className}`}>
                    <Icon className={`h-3.5 w-3.5 ${meta.pulse ? 'animate-pulse' : ''}`} /> {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <div className="mt-5 w-full shrink-0 space-y-5 lg:mt-0 lg:w-[242px]">
        <div className="rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">
            <HelpCircle className="h-3.5 w-3.5" /> Como funciona
          </div>
          <ol className="space-y-2 text-[11px] text-gray-600 dark:text-zinc-400">
            {TRANSFER_STEPS.map((step, i) => (
              <li key={step} className="flex gap-1.5">
                <span className="shrink-0 font-bold text-gray-400 dark:text-zinc-600">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {pendingRequests.length > 0 && (
          <div className="rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">
              <Server className="h-3.5 w-3.5" /> DNS actual (ainda no registador antigo)
            </div>
            <div className="space-y-2">
              {pendingRequests.map((r) => (
                <DnsSnapshotCard key={r.id} domain={r.domain_name} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
