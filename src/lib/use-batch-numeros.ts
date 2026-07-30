'use client';

import { useEffect, useState } from 'react';
import { batchNumero } from '@/lib/quotation-batch';

/** Números práticos das encomendas (ex.: 252026D001), indexados por batch_id. */
export function useBatchNumeros(): Record<string, string> {
  const [numeros, setNumeros] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cotacoes/numeros')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setNumeros(data.numeros);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return numeros;
}

/**
 * Número a mostrar para uma encomenda. Enquanto os números "reais"
 * (sequenciais, ex.: 292026P002) ainda não chegaram do servidor, `numeros`
 * está vazio — mostrar aí o derivado do batch_id (ex.: 9073B909) parecia um
 * número real, só que diferente, e trocava por baixo dos olhos do cliente
 * assim que a resposta chegava. Um placeholder neutro deixa claro que ainda
 * está a carregar. `batchNumero()` só entra como último recurso depois de
 * carregado, se por algum motivo este batch não vier no mapa (não devia
 * acontecer — ver comentário em admin/cotacoes/route.ts).
 */
export function displayNumero(numeros: Record<string, string>, batchId: string): string {
  if (numeros[batchId]) return numeros[batchId];
  return Object.keys(numeros).length === 0 ? '···' : batchNumero(batchId);
}
