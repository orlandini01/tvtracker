import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listLibrary, STATUS_LABEL_KEYS, type LibraryEntry, type WatchStatus } from "../lib/library";
import { EmptyState } from "../components/EmptyState";
import { MediaCard } from "../components/MediaCard";
import { SkeletonCardGrid } from "../components/Skeleton";
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

// Client-side pois a lista inteira já vem num único request (sem paginação) —
// não vale a pena mandar params de ordenação pro backend só pra isso.
type SortValue = "updated" | "rating" | "title" | "watched";

const SORTS: { value: SortValue; labelKey: string }[] = [
  { value: "updated", labelKey: "myList.sort_updated" },
  { value: "rating", labelKey: "myList.sort_rating" },
  { value: "title", labelKey: "myList.sort_title" },
  { value: "watched", labelKey: "myList.sort_watched" },
];

function sortEntries(entries: LibraryEntry[], sort: SortValue): LibraryEntry[] {
  const sorted = [...entries];
  switch (sort) {
    case "rating":
      // sem nota vai pro final, não pro topo (null tratado como -1)
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "watched":
      sorted.sort((a, b) => {
        if (!a.watched_at && !b.watched_at) return 0;
        if (!a.watched_at) return 1;
        if (!b.watched_at) return -1;
        return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
      });
      break;
    case "updated":
    default:
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
  }
  return sorted;
}

export function MyListPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("updated");

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

  const sortedData = useMemo(() => (query.data ? sortEntries(query.data, sort) : undefined), [query.data, sort]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("myList.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
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

          <label className="flex items-center gap-2 text-sm text-neutral-400 shrink-0">
            {t("myList.sort_heading")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-purple-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {query.isLoading && <SkeletonCardGrid />}
        {query.isError && <p className="text-red-400 text-sm">{t("myList.error")}</p>}
        {sortedData && sortedData.length === 0 && (
          <EmptyState icon="📼" message={t("myList.empty")} />
        )}

        {sortedData && sortedData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 fade-in">
            {sortedData.map((entry) => (
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
