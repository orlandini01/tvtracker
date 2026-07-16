import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listLibrary, STATUS_LABEL_KEYS, type WatchStatus } from "../lib/library";
import { MediaCard } from "../components/MediaCard";
import { btnSecondary } from "../lib/buttonStyles";

type FilterValue = "all" | "favorites" | WatchStatus;

const FILTERS: { value: FilterValue; labelKey: string }[] = [
  { value: "all", labelKey: "myList.filter_all" },
  { value: "favorites", labelKey: "myList.filter_favorites" },
  { value: "quero_assistir", labelKey: STATUS_LABEL_KEYS.quero_assistir },
  { value: "assistindo", labelKey: STATUS_LABEL_KEYS.assistindo },
  { value: "assistido", labelKey: STATUS_LABEL_KEYS.assistido },
  { value: "abandonei", labelKey: STATUS_LABEL_KEYS.abandonei },
];

export function MyListPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterValue>("all");

  const query = useQuery({
    queryKey: ["library-list", filter],
    queryFn: () =>
      listLibrary(
        filter === "all"
          ? undefined
          : filter === "favorites"
            ? { favoritesOnly: true }
            : { status: filter },
      ),
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("myList.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${
                filter === f.value ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {query.isLoading && <p className="text-neutral-400 text-sm">{t("myList.loading")}</p>}
        {query.isError && <p className="text-red-400 text-sm">{t("myList.error")}</p>}
        {query.data && query.data.length === 0 && (
          <p className="text-neutral-400 text-sm">{t("myList.empty")}</p>
        )}

        {query.data && query.data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {query.data.map((entry) => (
              <MediaCard
                key={`${entry.media_type}-${entry.tmdb_id}`}
                item={{
                  tmdb_id: entry.tmdb_id,
                  media_type: entry.media_type,
                  title: entry.title,
                  overview: "",
                  poster_url: entry.poster_url,
                  release_date: null,
                  vote_average: null,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
