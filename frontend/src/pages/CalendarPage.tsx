import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { downloadIcsExport, getCalendar, googleCalendarLink, type CalendarItem } from "../lib/calendar";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(i18n.language, { day: "2-digit", month: "short", year: "numeric" });
}

function CalendarRow({ item }: { item: CalendarItem }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-800 hover:border-purple-500 px-3 py-3 transition-colors">
      <Link to={`/media/${item.media_type}/${item.tmdb_id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-12 h-16 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <div className="w-12 h-16 rounded-sm bg-neutral-800 flex-shrink-0 flex items-center justify-center text-[10px] text-neutral-500 text-center px-1">
            {t("mediaCard.no_poster")}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.kind === "episode" ? (
            <p className="text-xs text-neutral-400">
              {t("calendar.episode_label", { season: item.season_number, episode: item.episode_number })}
              {item.episode_name ? ` — ${item.episode_name}` : ""}
            </p>
          ) : (
            <p className="text-xs text-neutral-400">{t("calendar.movie_release_label")}</p>
          )}
        </div>

        <span className="text-xs text-purple-400 whitespace-nowrap flex-shrink-0">{formatDate(item.date)}</span>
      </Link>

      <a
        href={googleCalendarLink(item)}
        target="_blank"
        rel="noreferrer"
        title={t("calendar.add_to_google")}
        className="shrink-0 rounded-md border border-neutral-700 hover:border-purple-500 w-8 h-8 flex items-center justify-center text-sm"
      >
        📅
      </a>
    </div>
  );
}

export function CalendarPage() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const query = useQuery({
    queryKey: ["calendar"],
    queryFn: getCalendar,
  });

  async function handleExport() {
    setExportError(false);
    setExporting(true);
    try {
      await downloadIcsExport();
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("calendar.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">{t("calendar.subtitle")}</p>
          <button onClick={handleExport} disabled={exporting} className={btnSecondarySmall}>
            {exporting ? t("common.loading") : t("calendar.export_ics")}
          </button>
        </div>
        {exportError && <p className="text-xs text-red-400">{t("calendar.export_error")}</p>}

        {query.isLoading && <SkeletonRows count={5} />}
        {query.isError && <p className="text-sm text-red-400">{t("calendar.error")}</p>}
        {query.data && query.data.length === 0 && (
          <EmptyState icon="📅" message={t("calendar.empty")} />
        )}

        {query.data && query.data.length > 0 && (
          <div className="flex flex-col gap-2 fade-in">
            {query.data.map((item) => (
              <CalendarRow key={`${item.media_type}-${item.tmdb_id}`} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
