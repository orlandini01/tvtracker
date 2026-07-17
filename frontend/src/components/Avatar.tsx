// Avatar "de iniciais" — sem upload de foto de perfil no app, então cada
// usuário ganha um círculo colorido (cor estável, derivada do username) com
// a primeira letra do nome. Dá uma cara de rede social de verdade pro feed
// sem precisar de armazenamento de imagem nenhum.
const COLORS = [
  "bg-purple-600",
  "bg-pink-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
];

function colorForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZE_CLASSES = {
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
};

export function Avatar({ username, size = "md" }: { username: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = SIZE_CLASSES[size];
  return (
    <div
      className={`${sizeClass} ${colorForUsername(username)} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
