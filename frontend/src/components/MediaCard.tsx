import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MediaSummary } from "../lib/media";

export function MediaCard({ item }: { item: MediaSummary }) {
  const { t } = useTranslation();
  const year = item.release_date?.slice(0, 4);

  return (
    <Link
      to={`/media/${item.media_type}/${item.tmdb_id}`}
      className="group flex flex-col gap-2 rounded-lg overflow-hidden border border-neutral-800 hover:border-purple-500 transition-colors bg-neutral-900"
    >
      <div className="aspect-[2/3] bg-neutral-800 flex items-center justify-center overflow-hidden">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-xs text-neutral-500 px-2 text-center">{t("mediaCard.no_poster")}</span>
        )}
      </div>
      <div className="px-2 pb-2">
        <p className="text-sm font-medium truncate" title={item.title}>
          {item.title}
        </p>
        <p className="text-xs text-neutral-500">
          {year ?? "—"} · {item.media_type === "tv" ? t("mediaCard.tv") : t("mediaCard.movie")}
        </p>
      </div>
    </Link>
  );
}
