import { cn } from '@/lib/utils';

/**
 * Ícone de "a processar" padrão do site — anel cinzento com arco vermelho a rodar.
 * `className` controla o tamanho (ex.: "w-4 h-4"), por defeito w-4 h-4.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-red-600 dark:border-zinc-700 dark:border-t-red-500',
        className || 'w-4 h-4',
      )}
      role="status"
      aria-label="A processar"
    />
  );
}
