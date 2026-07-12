import { api } from "./api";
import type { MediaType } from "./media";

export type ActivityAction = "favorited" | "status_changed" | "rated" | "commented";

export type Activity = {
  id: string;
  user: { id: string; username: string };
  media: {
    tmdb_id: number;
    media_type: MediaType;
    title: string;
    poster_url: string | null;
  };
  action: ActivityAction;
  detail: string | null;
  created_at: string;
};

export type FeedPage = {
  results: Activity[];
  page: number;
  has_more: boolean;
};

export async function getFeed(page: number): Promise<FeedPage> {
  const { data } = await api.get<FeedPage>("/feed", { params: { page, page_size: 20 } });
  return data;
}
