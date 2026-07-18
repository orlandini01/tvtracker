import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdvancedStats } from "../lib/stats";
import { SkeletonBlock } from "../components/Skeleton";
import { btnSecondary } from "../lib/buttonStyles";

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 py-5 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

function BarList({ items, max }: { items: { name: string; count: number }[]; max: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-3">
          <span className="text-sm w-32 shrink-0 truncate" title={item.name}>{item.name}</span>
          <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${max > 0 ? Math.max((item.count / max) * 100, 4) : 0}%` }}
            />
          </div>
          <span className="text-xs text-neutral-500 w-6 text-right shrink-0">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatsPage() {
  const { t } = useTranslation();

  const statsQuery = useQuery({
    queryKey: ["stats-advanced"],
    queryFn: getAdvancedStats,
  });

  const stats = statsQuery.data;
  const hours = stats ? Math.round((stats.total_minutes_watched / 60) * 10) / 10 : 0;
  const maxGenre = stats ? Math.max(1, ...stats.top_genres.map((g) => g.count)) : 1;
  const maxPerson = stats ? Math.max(1, ...stats.top_people.map((p) => p.count)) : 1;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("stats.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-8">
        {statsQuery.isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}
          </div>
        )}
        {statsQuery.isError && <p className="text-sm text-red-400">{t("stats.error")}</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={stats.movies_watched} label={t("stats.movies_watched")} />
              <StatCard value={stats.shows_watched} label={t("stats.shows_watched")} />
              <StatCard value={hours} label={t("stats.hours_watched")} />
              <StatCard value={stats.longest_streak_days} label={t("stats.longest_streak")} />
            </div>

            <section>
              <h2 className="text-sm font-medium text-neutral-400 mb-3">{t("stats.top_genres_heading")}</h2>
              {stats.top_genres.length === 0 ? (
                <p className="text-sm text-neutral-500">{t("stats.no_data")}</p>
              ) : (
                <BarList items={stats.top_genres} max={maxGenre} />
              )}
            </section>

            <section>
              <h2 className="text-sm font-medium text-neutral-400 mb-3">{t("stats.top_people_heading")}</h2>
              {stats.top_people.length === 0 ? (
                <p className="text-sm text-neutral-500">{t("stats.no_data")}</p>
              ) : (
                <BarList items={stats.top_people} max={maxPerson} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
