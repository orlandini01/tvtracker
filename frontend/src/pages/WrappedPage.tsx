import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getWrapped } from "../lib/wrapped";

const CURRENT_YEAR = new Date().getFullYear();

export function WrappedPage() {
  const [year, setYear] = useState(CURRENT_YEAR);

  const query = useQuery({
    queryKey: ["wrapped", year],
    queryFn: () => getWrapped(year),
  });

  const data = query.data;
  const hasActivity = data && (data.total_movies > 0 || data.total_shows > 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">Wrapped</h1>
        <Link to="/" className="text-sm text-purple-400 hover:underline">← Descobrir</Link>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-full border border-neutral-700 hover:border-purple-500 w-8 h-8 flex items-center justify-center"
          >
            ←
          </button>
          <h2 className="text-3xl font-bold">{year}</h2>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= CURRENT_YEAR}
            className="rounded-full border border-neutral-700 hover:border-purple-500 disabled:opacity-30 disabled:hover:border-neutral-700 w-8 h-8 flex items-center justify-center"
          >
            →
          </button>
        </div>

        {query.isLoading && <p className="text-sm text-neutral-400 text-center">Carregando...</p>}
        {query.isError && <p className="text-sm text-red-400 text-center">Não foi possível carregar o seu Wrapped.</p>}

        {data && !hasActivity && (
          <p className="text-sm text-neutral-400 text-center mt-10">
            Nada registrado em {year} ainda. Marque filmes e séries como assistidos pra ver seu resumo aqui.
          </p>
        )}

        {data && hasActivity && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-purple-900/60 to-neutral-900 border border-purple-800/50 py-10 px-6 text-center mb-6">
              <p className="text-sm text-purple-300 mb-2">Você assistiu</p>
              <p className="text-6xl font-extrabold text-white">
                {data.total_hours}
                <span className="text-2xl font-normal text-purple-300 ml-2">horas</span>
              </p>
              {data.hours_change_pct !== null && (
                <p className={`text-sm mt-3 ${data.hours_change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {data.hours_change_pct >= 0 ? "▲" : "▼"} {Math.abs(data.hours_change_pct)}% em relação a {year - 1}{" "}
                  ({data.previous_year_hours}h)
                </p>
              )}
              {data.hours_change_pct === null && (
                <p className="text-sm text-neutral-500 mt-3">Sem dados de {year - 1} pra comparar.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-neutral-800 py-5 text-center">
                <p className="text-3xl font-bold">{data.total_movies}</p>
                <p className="text-xs text-neutral-500 mt-1">filme{data.total_movies === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 py-5 text-center">
                <p className="text-3xl font-bold">{data.total_shows}</p>
                <p className="text-xs text-neutral-500 mt-1">série{data.total_shows === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 py-5 text-center">
                <p className="text-3xl font-bold">{data.total_episodes}</p>
                <p className="text-xs text-neutral-500 mt-1">episódio{data.total_episodes === 1 ? "" : "s"}</p>
              </div>
            </div>

            {data.top_genres.length > 0 && (
              <div className="rounded-xl border border-neutral-800 p-5 mb-6">
                <h3 className="text-sm font-medium text-neutral-400 mb-3">Seus gêneros favoritos</h3>
                <div className="flex flex-wrap gap-2">
                  {data.top_genres.map((g, idx) => (
                    <span
                      key={g.name}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        idx === 0 ? "bg-purple-600 border-purple-500" : "border-neutral-700 text-neutral-300"
                      }`}
                    >
                      {idx + 1}. {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.top_show && (
                <Link
                  to={`/media/tv/${data.top_show.tmdb_id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-800 hover:border-purple-500 p-4 transition-colors"
                >
                  <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-neutral-800">
                    {data.top_show.poster_url && (
                      <img src={data.top_show.poster_url} alt={data.top_show.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Série mais assistida</p>
                    <p className="font-medium text-purple-400">{data.top_show.title}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {data.top_show_episode_count} episódio{data.top_show_episode_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              )}

              {data.top_movie && (
                <Link
                  to={`/media/movie/${data.top_movie.tmdb_id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-800 hover:border-purple-500 p-4 transition-colors"
                >
                  <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-neutral-800">
                    {data.top_movie.poster_url && (
                      <img src={data.top_movie.poster_url} alt={data.top_movie.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Filme destaque</p>
                    <p className="font-medium text-purple-400">{data.top_movie.title}</p>
                  </div>
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
