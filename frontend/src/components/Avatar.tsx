import { API_BASE_URL } from "../lib/api";

// Avatar: se o usuário tiver enviado uma foto customizada (avatarUrl), mostra
// a imagem de verdade; senão cai no círculo colorido com a inicial do nome
// (cor estável, derivada do username) — assim o app funciona bem mesmo pra
// quem nunca fez upload de nada.
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

export function resolveAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  return `${API_BASE_URL}${avatarUrl}`;
}

export function Avatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = SIZE_CLASSES[size];
  const src = resolveAvatarSrc(avatarUrl);

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className={`${sizeClass} rounded-full object-cover shrink-0 bg-neutral-800`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${colorForUsername(username)} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
