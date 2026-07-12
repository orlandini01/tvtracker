import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeed, type Activity } from "../lib/feed";
import { STATUS_LABELS, type WatchStatus } from "../lib/library";

function describeActivity(activity: Activity): string {
  const who = activity.user.username;
  switch (activity.action) {
    case "favorited":
      return `${who} favoritou`;
    case "status_changed": {
      const label = STATUS_LABELS[activity.detail as WatchStatus] ?? activity.detail;
      return `${who} marcou como "${label}"`;
    }
    case "rated":
      return `${who} deu nota ${activity.detail} para`;
    default:
      return `${who} atualizou`;
  }
}

export function FeedPage() {
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
        <h1 className="text-2xl font-semibold">Feed dos amigos</h1>
        <Link to="/" className="text-sm text-purple-400 hover:underline">← Descobrir</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto">
        {feedQuery.isLoading && <p className="text-neutral-400 text-sm">Carregando...</p>}
        {feedQuery.isError && <p className="text-red-400 text-sm">Não foi possível carregar o feed.</p>}
        {showEmpty && (
          <p className="text-neutral-400 text-sm">
            Nada por aqui ainda. Adicione amigos na página "Amigos" para ver as atividades deles aqui.
          </p>
        )}

        {activities.length > 0 && (
          <>
            <ul className="flex flex-col gap-3">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
                  <Link to={`/media/${activity.media.media_type}/${activity.media.tmdb_id}`} className="shrink-0 w-12 h-18 rounded overflow-hidden bg-neutral-800">
                    {activity.media.poster_url ? (
                      <img src={activity.media.poster_url} alt={activity.media.title} className="w-full h-full object-cover" />
                    ) : null}
                  </Link>
                  <p className="text-sm">
                    <span className="text-neutral-300">{describeActivity(activity)}</span>{" "}
                    <Link to={`/media/${activity.media.media_type}/${activity.media.tmdb_id}`} className="font-medium text-purple-400 hover:underline">
                      {activity.media.title}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>

            <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
              {feedQuery.isFetchingNextPage && <span className="text-xs text-neutral-500">Carregando mais...</span>}
              {!feedQuery.hasNextPage && !feedQuery.isFetchingNextPage && (
                <span className="text-xs text-neutral-600">Fim do feed.</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
