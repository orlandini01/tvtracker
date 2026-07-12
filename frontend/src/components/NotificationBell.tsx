import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications";

// Poll leve só pro contador do sino — mantém o badge atualizado mesmo se o
// usuário ficar navegando sem abrir o dropdown.
const UNREAD_POLL_INTERVAL = 60 * 1000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: UNREAD_POLL_INTERVAL,
  });

  const listQuery = useQuery({
    queryKey: ["notifications-list"],
    queryFn: getNotifications,
    enabled: open,
  });

  useEffect(() => {
    if (listQuery.data) {
      queryClient.setQueryData(["notifications-unread-count"], listQuery.data.unread_count);
    }
  }, [listQuery.data, queryClient]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const unreadCount = unreadQuery.data ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className="relative rounded-full border border-neutral-700 hover:border-purple-500 w-9 h-9 flex items-center justify-center text-lg"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl z-50">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800">
            <span className="text-sm font-medium">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-purple-400 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {listQuery.isLoading && <p className="text-xs text-neutral-500 px-3 py-3">Carregando...</p>}
          {listQuery.isError && <p className="text-xs text-red-400 px-3 py-3">Não foi possível carregar.</p>}
          {listQuery.data && listQuery.data.results.length === 0 && (
            <p className="text-xs text-neutral-500 px-3 py-3">Nenhuma notificação por aqui.</p>
          )}

          <ul>
            {listQuery.data?.results.map((n) => (
              <li key={n.id} className="border-b border-neutral-800 last:border-b-0">
                <Link
                  to={`/media/${n.media.media_type}/${n.media.tmdb_id}`}
                  onClick={() => {
                    setOpen(false);
                    if (!n.is_read) markReadMutation.mutate(n.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 ${!n.is_read ? "bg-neutral-800/40" : ""}`}
                >
                  <div className="w-8 h-8 shrink-0 rounded overflow-hidden bg-neutral-800">
                    {n.media.poster_url && (
                      <img src={n.media.poster_url} alt={n.media.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-200 truncate">{n.message}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
