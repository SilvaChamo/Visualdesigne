'use client';

import { useEffect, useState } from 'react';

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
