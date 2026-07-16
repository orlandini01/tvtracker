// Estilos de botão compartilhados por toda a UI. Antes cada página inventava
// sua própria variação (link sublinhado, texto colorido solto etc.) — agora
// toda ação "de verdade" (voltar, confirmar, cancelar, remover...) usa uma
// dessas classes, então o app inteiro fala a mesma língua visual.
export const btnPrimary =
  "rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors";

export const btnPrimarySmall =
  "rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-medium transition-colors";

export const btnSecondary =
  "rounded-md border border-neutral-700 hover:border-purple-500 hover:bg-neutral-800 px-3 py-1.5 text-sm font-medium transition-colors";

export const btnSecondarySmall =
  "rounded-md border border-neutral-700 hover:border-purple-500 hover:text-purple-400 px-3 py-1 text-xs font-medium transition-colors";

export const btnDanger =
  "rounded-md border border-red-900 text-red-400 hover:bg-red-950/50 hover:border-red-700 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const btnDangerSmall =
  "rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

// Variante de destaque roxo "vazado" (sem preenchimento) — usada em ações
// secundárias importantes que não são nem a ação primária nem destrutivas
// (ex: marcar temporada inteira como assistida).
export const btnAccentSmall =
  "rounded-md border border-purple-800 text-purple-300 hover:bg-purple-950/50 hover:border-purple-600 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
