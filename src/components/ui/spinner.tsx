import { cn } from '@/lib/utils';

/**
 * Ícone de "a processar" padrão do site — anel vermelho com arco cinza claro a rodar.
 * Tamanho fixo (w-7 h-7, anel de 3px) em todo o site — uniforme por omissão, não
 * configurável por tamanho/espessura via `className` (só cores/espaçamento passam).
 * Excepção: dentro de um <button>, uma regra em globals.css (`.panel-spinner`) reduz
 * automaticamente o tamanho — não precisa de ser passado aqui.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'panel-spinner inline-block shrink-0 animate-spin rounded-full border-red-600 border-t-gray-300 dark:border-red-500 dark:border-t-gray-400',
        className,
        'w-7 h-7 border-[3px]',
      )}
      role="status"
      aria-label="A processar"
    />
  );
}
