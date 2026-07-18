import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { getDiary, type DiaryEntry } from "../lib/diary";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language, { day: "2-digit", month: "long", year: "numeric" });
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3 fade-in">
      <Link to={`/media/${entry.media.media_type}/${entry.media.tmdb_id}`} className="shrink-0 w-12 h-18 rounded overflow-hidden bg-neutral-800">
        {entry.media.poster_url && <img src={entry.media.poster_url} alt={entry.media.title} className="w-full h-full object-cover" />}
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/media/${entry.media.media_type}/${entry.media.tmdb_id}`} className="font-medium text-purple-400 hover:underline truncate block">
          {entry.media.title}
        </Link>
        <p className="text-xs text-neutral-500 mt-0.5">
          {entry.type === "movie" ? t("diary.type_movie") : entry.detail}
        </p>
        <p className="text-xs text-neutral-600 mt-0.5">{formatDay(entry.watched_at)}</p>
      </div>
      {entry.rating != null && (
        <span className="shrink-0 rounded-md border border-purple-800 text-purple-300 px-2 py-1 text-xs font-medium">
          ★ {entry.rating}
        </span>
      )}
    </li>
  );
}

export function DiaryPage() {
  const { t } = useTranslation();

  const diaryQuery = useInfiniteQuery({
    queryKey: ["diary"],
    queryFn: ({ pageParam }) => getDiary(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });

  const entries = diaryQuery.data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("diary.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        {diaryQuery.isLoading && <SkeletonRows count={6} />}
        {diaryQuery.isError && <p className="text-sm text-red-400">{t("diary.error")}</p>}
        {diaryQuery.data && entries.length === 0 && <EmptyState icon="📔" message={t("diary.empty")} />}

        <ul className="flex flex-col gap-3">
          {entries.map((entry, idx) => (
            <DiaryRow key={`${entry.type}-${entry.media.tmdb_id}-${entry.watched_at}-${idx}`} entry={entry} />
          ))}
        </ul>

        {diaryQuery.hasNextPage && (
          <button
            onClick={() => diaryQuery.fetchNextPage()}
            disabled={diaryQuery.isFetchingNextPage}
            className={`${btnSecondarySmall} self-center`}
          >
            {diaryQuery.isFetchingNextPage ? t("diary.loading_more") : t("diary.load_more")}
          </button>
        )}
      </main>
    </div>
  );
}
