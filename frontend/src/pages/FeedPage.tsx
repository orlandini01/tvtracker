import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getFeed, type Activity } from "../lib/feed";
import { STATUS_LABEL_KEYS, type WatchStatus } from "../lib/library";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { btnSecondary } from "../lib/buttonStyles";

function describeActivity(t: TFunction, activity: Activity): string {
  const who = activity.user.username;
  switch (activity.action) {
    case "favorited":
      return t("feed.activity_favorited", { who });
    case "status_changed": {
      const label = activity.detail ? t(STATUS_LABEL_KEYS[activity.detail as WatchStatus]) : activity.detail;
      return t("feed.activity_status_changed", { who, label });
    }
    case "rated":
      return t("feed.activity_rated", { who, rating: activity.detail });
    case "commented":
      return t("feed.activity_commented", { who });
    default:
      return t("feed.activity_default", { who });
  }
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
                <li key={activity.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
                  <Link to={`/media/${activity.media.media_type}/${activity.media.tmdb_id}`} className="shrink-0 w-12 h-18 rounded overflow-hidden bg-neutral-800">
                    {activity.media.poster_url ? (
                      <img src={activity.media.poster_url} alt={activity.media.title} className="w-full h-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="text-sm">
                    <p>
                      <span className="text-neutral-300">{describeActivity(t, activity)}</span>{" "}
                      <Link to={`/media/${activity.media.media_type}/${activity.media.tmdb_id}`} className="font-medium text-purple-400 hover:underline">
                        {activity.media.title}
                      </Link>
                    </p>
                    {activity.action === "commented" && activity.detail && (
                      <p className="text-neutral-500 italic mt-1">"{activity.detail}"</p>
                    )}
                  </div>
                </li>
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
