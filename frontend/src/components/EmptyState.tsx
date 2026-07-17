// Estado vazio padrão — ícone + mensagem, no lugar do antigo texto cinza
// solto. Usado em qualquer lista/grid que pode vir vazia (sem título
// favoritado, sem amigos, sem notificações etc).
export function EmptyState({ icon = "🍿", message, className = "" }: { icon?: string; message: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-center ${className}`}>
      <span className="text-4xl opacity-70">{icon}</span>
      <p className="text-sm text-neutral-500 max-w-sm">{message}</p>
    </div>
  );
}
