import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicWrapped } from "../lib/wrapped";
import { btnPrimary } from "../lib/buttonStyles";

const CURRENT_YEAR = new Date().getFullYear();

// Versão pública (sem login) do Wrapped, acessada via /w/:token. Mesma
// visualização da WrappedPage, mas somente-leitura: sem link pra
// /media/... (essas rotas exigem login e redirecionariam pro /login,
// confundindo um visitante que nunca criou conta) e com uma chamada pra
// ação convidando a criar conta no final.
export function PublicWrappedPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [year, setYear] = useState(CURRENT_YEAR);

  const query = useQuery({
    queryKey: ["public-wrapped", token, year],
    queryFn: () => getPublicWrapped(token!, year),
    enabled: Boolean(token),
    retry: false,
  });

  const data = query.data;
  const hasActivity = data && (data.total_movies > 0 || data.total_shows > 0);

  if (query.isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100 px-6 text-center">
        <p className="text-red-400">{t("publicWrapped.not_found")}</p>
        <Link to="/" className={btnPrimary}>
          {t("publicWrapped.go_home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">TrackerTV</h1>
        <Link to="/signup" className={btnPrimary}>
          {t("publicWrapped.cta_button")}
        </Link>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto">
        {query.isLoading && <p className="text-sm text-neutral-400 text-center">{t("wrapped.loading")}</p>}

        {data && (
          <>
            <p className="text-center text-neutral-400 mb-2">
              {t("publicWrapped.heading", { username: data.username })}
            </p>

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

            {!hasActivity && (
              <p className="text-sm text-neutral-400 text-center mt-10">{t("wrapped.empty_year", { year })}</p>
            )}

            {hasActivity && (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-purple-900/60 to-neutral-900 border border-purple-800/50 py-10 px-6 text-center mb-6">
                  <p className="text-sm text-purple-300 mb-2">{t("wrapped.watched_heading")}</p>
                  <p className="text-6xl font-extrabold text-white">
                    {data.total_hours}
                    <span className="text-2xl font-normal text-purple-300 ml-2">{t("wrapped.hours_unit")}</span>
                  </p>
                  {data.hours_change_pct !== null && (
                    <p className={`text-sm mt-3 ${data.hours_change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {t("wrapped.change_vs_year", {
                        arrow: data.hours_change_pct >= 0 ? "▲" : "▼",
                        pct: Math.abs(data.hours_change_pct),
                        year: year - 1,
                        hours: data.previous_year_hours,
                      })}
                    </p>
                  )}
                  {data.hours_change_pct === null && (
                    <p className="text-sm text-neutral-500 mt-3">{t("wrapped.no_comparison_data", { year: year - 1 })}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl border border-neutral-800 py-5 text-center">
                    <p className="text-3xl font-bold">{data.total_movies}</p>
                    <p className="text-xs text-neutral-500 mt-1">{t("wrapped.movies_label", { count: data.total_movies })}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 py-5 text-center">
                    <p className="text-3xl font-bold">{data.total_shows}</p>
                    <p className="text-xs text-neutral-500 mt-1">{t("wrapped.shows_label", { count: data.total_shows })}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 py-5 text-center">
                    <p className="text-3xl font-bold">{data.total_episodes}</p>
                    <p className="text-xs text-neutral-500 mt-1">{t("wrapped.episodes_label", { count: data.total_episodes })}</p>
                  </div>
                </div>

                {data.top_genres.length > 0 && (
                  <div className="rounded-xl border border-neutral-800 p-5 mb-6">
                    <h3 className="text-sm font-medium text-neutral-400 mb-3">{t("wrapped.genres_heading")}</h3>
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
                    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 p-4">
                      <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-neutral-800">
                        {data.top_show.poster_url && (
                          <img src={data.top_show.poster_url} alt={data.top_show.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">{t("wrapped.top_show_label")}</p>
                        <p className="font-medium text-purple-400">{data.top_show.title}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {t("wrapped.top_show_episode_count", { count: data.top_show_episode_count ?? 0 })}
                        </p>
                      </div>
                    </div>
                  )}

                  {data.top_movie && (
                    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 p-4">
                      <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-neutral-800">
                        {data.top_movie.poster_url && (
                          <img src={data.top_movie.poster_url} alt={data.top_movie.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">{t("wrapped.top_movie_label")}</p>
                        <p className="font-medium text-purple-400">{data.top_movie.title}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-10 rounded-xl border border-purple-800/50 bg-purple-950/20 p-5 text-center">
              <p className="text-sm text-neutral-300 mb-3">{t("publicWrapped.cta_text")}</p>
              <Link to="/signup" className={btnPrimary}>
                {t("publicWrapped.cta_button")}
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
