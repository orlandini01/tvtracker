import { api } from "./api";
import type { MediaType } from "./media";

export type Notification = {
  id: string;
  media: {
    tmdb_id: number;
    media_type: MediaType;
    title: string;
    poster_url: string | null;
  };
  kind: "new_episodes";
  message: string;
  created_at: string;
  is_read: boolean;
};

export type NotificationListResponse = {
  results: Notification[];
  unread_count: number;
};

export async function getNotifications(): Promise<NotificationListResponse> {
  const { data } = await api.get<NotificationListResponse>("/notifications");
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread_count: number }>("/notifications/unread-count");
  return data.unread_count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
