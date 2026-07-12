import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCompatibility } from "../lib/compare";
import { STATUS_LABELS, type WatchStatus } from "../lib/library";

function SignalBadges({ is_favorite, status, rating }: { is_favorite: boolean; status: WatchStatus | null; rating: number | null }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {is_favorite && <span className="text-xs px-1.5 py-0.5 rounded bg-pink-950 text-pink-400">♥ favorito</span>}
      {status && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-950 text-purple-400">{STATUS_LABELS[status]}</span>}
      {rating != null && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-400">nota {rating}</span>}
      {!is_favorite && !status && rating == null && <span className="text-xs text-neutral-600">—</span>}
    </div>
  );
}

export function ComparePage() {
  const { friendId } = useParams<{ friendId: string }>();

  const query = useQuery({
    queryKey: ["compare", friendId],
    queryFn: () => getCompatibility(friendId as string),
    enabled: Boolean(friendId),
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">Comparar gostos</h1>
        <Link to="/amigos" className="text-sm text-purple-400 hover:underline">← Amigos</Link>
      </header>

      <main className="px-6 py-6 max-w-3xl mx-auto">
        {query.isLoading && <p className="text-sm text-neutral-400">Carregando...</p>}
        {query.isError && (
          <p className="text-sm text-red-400">
            Não foi possível comparar (talvez vocês não sejam mais amigos).
          </p>
        )}

        {query.data && (
          <>
            <div className="flex flex-col items-center gap-2 mb-8 rounded-xl border border-neutral-800 py-8">
              <p className="text-sm text-neutral-400">Compatibilidade com {query.data.friend.username}</p>
              <p className="text-5xl font-bold text-purple-400">{query.data.compatibility_score}%</p>
              <p className="text-xs text-neutral-500">
                {query.data.common_count} título{query.data.common_count === 1 ? "" : "s"} em comum de {query.data.total_count} no total
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-sm font-medium text-neutral-400 mb-3">Títulos em comum</h2>
              {query.data.common_titles.length === 0 && (
                <p className="text-sm text-neutral-500">Ainda não têm nenhum título em comum.</p>
              )}
              <ul className="flex flex-col gap-3">
                {query.data.common_titles.map((c) => (
                  <li key={`${c.media_type}-${c.tmdb_id}`} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
                    <Link to={`/media/${c.media_type}/${c.tmdb_id}`} className="shrink-0 w-12 h-18 rounded overflow-hidden bg-neutral-800">
                      {c.poster_url && <img src={c.poster_url} alt={c.title} className="w-full h-full object-cover" />}
                    </Link>
                    <div className="flex-1">
                      <Link to={`/media/${c.media_type}/${c.tmdb_id}`} className="font-medium text-purple-400 hover:underline">
                        {c.title}
                      </Link>
                      <div className="grid grid-cols-2 gap-4 mt-1">
                        <div>
                          <p className="text-xs text-neutral-500">Você</p>
                          <SignalBadges is_favorite={c.you.is_favorite} status={c.you.status} rating={c.you.rating} />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">{query.data!.friend.username}</p>
                          <SignalBadges is_favorite={c.friend.is_favorite} status={c.friend.status} rating={c.friend.rating} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-medium text-neutral-400 mb-3">
                Recomendados por {query.data.friend.username}
              </h2>
              {query.data.recommendations.length === 0 && (
                <p className="text-sm text-neutral-500">Nada novo pra recomendar por enquanto.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {query.data.recommendations.map((r) => (
                  <Link
                    key={`${r.media_type}-${r.tmdb_id}`}
                    to={`/media/${r.media_type}/${r.tmdb_id}`}
                    className="flex flex-col gap-2 rounded-lg overflow-hidden border border-neutral-800 hover:border-purple-500 transition-colors bg-neutral-900"
                  >
                    <div className="aspect-[2/3] bg-neutral-800 flex items-center justify-center overflow-hidden">
                      {r.poster_url ? (
                        <img src={r.poster_url} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-500 px-2 text-center">Sem pôster</span>
                      )}
                    </div>
                    <div className="px-2 pb-2">
                      <p className="text-sm font-medium truncate" title={r.title}>{r.title}</p>
                      <SignalBadges is_favorite={r.friend_is_favorite} status={r.friend_status} rating={r.friend_rating} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
