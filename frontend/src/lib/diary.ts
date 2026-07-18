import { api } from "./api";
import type { MediaType } from "./media";

export type DiaryMedia = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
};

export type DiaryEntry = {
  type: "movie" | "episode_group";
  watched_at: string;
  media: DiaryMedia;
  detail: string | null;
  rating: number | null;
};

export type DiaryResponse = {
  results: DiaryEntry[];
  page: number;
  has_more: boolean;
};

export async function getDiary(page = 1, pageSize = 20): Promise<DiaryResponse> {
  const { data } = await api.get<DiaryResponse>("/diary", { params: { page, page_size: pageSize } });
  return data;
}
