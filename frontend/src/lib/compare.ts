import { api } from "./api";
import type { MediaType } from "./media";
import type { WatchStatus } from "./library";

export type LibrarySignal = {
  status: WatchStatus | null;
  is_favorite: boolean;
  rating: number | null;
};

export type CommonTitle = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  you: LibrarySignal;
  friend: LibrarySignal;
};

export type RecommendedTitle = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  friend_is_favorite: boolean;
  friend_rating: number | null;
  friend_status: WatchStatus | null;
};

export type CompareResponse = {
  friend: { id: string; username: string };
  compatibility_score: number;
  common_count: number;
  total_count: number;
  common_titles: CommonTitle[];
  recommendations: RecommendedTitle[];
};

export async function getCompatibility(friendId: string): Promise<CompareResponse> {
  const { data } = await api.get<CompareResponse>(`/friends/${friendId}/compare`);
  return data;
}
