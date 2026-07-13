import { api } from "./api";
import type { MediaType } from "./media";

export type TopGenre = {
  name: string;
  count: number;
};

export type WrappedMedia = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
};

export type WrappedResponse = {
  year: number;
  total_hours: number;
  total_movies: number;
  total_shows: number;
  total_episodes: number;
  top_genres: TopGenre[];
  top_show: WrappedMedia | null;
  top_show_episode_count: number | null;
  top_movie: WrappedMedia | null;
  previous_year_hours: number;
  hours_change_pct: number | null;
};

export async function getWrapped(year?: number): Promise<WrappedResponse> {
  const { data } = await api.get<WrappedResponse>("/wrapped", { params: year ? { year } : {} });
  return data;
}
