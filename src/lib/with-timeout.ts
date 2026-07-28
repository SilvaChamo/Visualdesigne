/**
 * O site corre num servidor Node persistente (pm2 + `next start` no Hetzner),
 * não em funções serverless — ao contrário da Vercel, não há nenhum limite de
 * tempo imposto pela plataforma. Um `await` a uma chamada externa (Supabase,
 * DirectAdmin, etc.) que nunca resolve fica pendurado para sempre e o pedido
 * do utilizador "processa e nunca pára".
 *
 * Isto não cancela a operação pendente (essa continua em segundo plano até
 * resolver/rejeitar por si), só pára de A ESPERAR por ela — o suficiente para
 * o utilizador deixar de ficar preso com um spinner infinito e ver um erro
 * accionável.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: demorou mais de ${Math.round(timeoutMs / 1000)}s.`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
