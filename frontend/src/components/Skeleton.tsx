// Placeholders "pulsando" pra estados de carregamento — substituem os
// antigos textos soltos tipo "Carregando..." nas listas/grids principais.
// Usa a própria animate-pulse do Tailwind, sem precisar de config extra.

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-800 ${className}`} />;
}

// Grade de cards estilo pôster (Home, Minha Lista, recomendações...).
export function SkeletonCardGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonBlock className="aspect-[2/3] w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// Lista de linhas horizontais (Feed, Calendário, Amigos, Listas...).
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
          <SkeletonBlock className="w-12 h-16 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
