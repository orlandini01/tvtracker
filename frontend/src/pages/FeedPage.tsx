import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getFeed, type Activity, type ActivityAction } from "../lib/feed";
import { STATUS_LABEL_KEYS, type WatchStatus } from "../lib/library";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { btnSecondary } from "../lib/buttonStyles";
import { formatRelativeTime } from "../lib/relativeTime";

// Ícone de destaque por tipo de atividade — reforça de relance o que
// aconteceu antes mesmo de ler o texto (igual qualquer feed social de
// verdade usa cor/ícone além de texto).
const ACTION_ICON: Record<ActivityAction, string> = {
  favorited: "❤️",
  status_changed: "🔄",
  rated: "⭐",
  commented: "💬",
};

function verbFor(t: TFunction, activity: Activity): string {
  switch (activity.action) {
    case "favorited":
      return t("feed.verb_favorited");
    case "status_changed": {
      const label = activity.detail ? t(STATUS_LABEL_KEYS[activity.detail as WatchStatus]) : activity.detail;
      return t("feed.verb_status_changed", { label });
    }
    case "rated":
      return t("feed.verb_rated");
    case "commented":
      return t("feed.verb_commented");
    default:
      return t("feed.verb_default");
  }
}

function ActivityCard({ activity, t }: { activity: Activity; t: TFunction }) {
  const mediaLink = `/media/${activity.media.media_type}/${activity.media.tmdb_id}`;

  return (
    <li className="rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/30 transition-colors p-4">
      <div className="flex items-start gap-3">
        <Link to={`/perfil/${activity.user.id}`}>
          <Avatar username={activity.user.username} />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <Link to={`/perfil/${activity.user.id}`} className="font-semibold text-neutral-100 hover:text-purple-400">
              {activity.user.username}
            </Link>{" "}
            <span className="text-neutral-400">{verbFor(t, activity)}</span>
            <span className="ml-1.5">{ACTION_ICON[activity.action]}</span>
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{formatRelativeTime(activity.created_at)}</p>

          <Link
            to={mediaLink}
            className="mt-3 flex items-center gap-3 rounded-lg bg-neutral-900/70 hover:bg-neutral-800 p-2 transition-colors"
          >
            <div className="relative w-12 h-18 rounded overflow-hidden bg-neutral-800 shrink-0">
              {activity.media.poster_url && (
                <img src={activity.media.poster_url} alt={activity.media.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-purple-400 truncate">{activity.media.title}</p>
              {activity.action === "rated" && activity.detail && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-950 text-yellow-400">
                  ⭐ {activity.detail}
                </span>
              )}
              {activity.action === "status_changed" && activity.detail && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-950 text-purple-400">
                  {t(STATUS_LABEL_KEYS[activity.detail as WatchStatus])}
                </span>
              )}
            </div>
          </Link>

          {activity.action === "commented" && activity.detail && (
            <div className="mt-2 rounded-lg bg-neutral-900/70 border-l-2 border-purple-700 px-3 py-2 text-sm text-neutral-300 italic">
              "{activity.detail}"
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function FeedPage() {
  const { t } = useTranslation();
  const feedQuery = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });

  const activities = useMemo(() => feedQuery.data?.pages.flatMap((p) => p.results) ?? [], [feedQuery.data]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
          feedQuery.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage]);

  const showEmpty = !feedQuery.isLoading && !feedQuery.isError && activities.length === 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("feed.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto">
        {feedQuery.isLoading && <SkeletonRows count={5} />}
        {feedQuery.isError && <p className="text-red-400 text-sm">{t("feed.error")}</p>}
        {showEmpty && <EmptyState icon="👥" message={t("feed.empty")} />}

        {activities.length > 0 && (
          <>
            <ul className="flex flex-col gap-3 fade-in">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} t={t} />
              ))}
            </ul>

            <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
              {feedQuery.isFetchingNextPage && <span className="text-xs text-neutral-500">{t("feed.loading_more")}</span>}
              {!feedQuery.hasNextPage && !feedQuery.isFetchingNextPage && (
                <span className="text-xs text-neutral-600">{t("feed.end")}</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
