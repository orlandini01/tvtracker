import { api } from "./api";

export type Episode = {
  episode_number: number;
  name: string;
  air_date: string | null;
  still_url: string | null;
  watched: boolean;
  rating: number | null;
};

export type SeasonEpisodesResponse = {
  season_number: number;
  episodes: Episode[];
};

export type ShowProgress = {
  watched_count: number;
  total_count: number;
};

export async function getSeasonEpisodes(tmdbId: number, seasonNumber: number): Promise<SeasonEpisodesResponse> {
  const { data } = await api.get<SeasonEpisodesResponse>(`/media/tv/${tmdbId}/season/${seasonNumber}`);
  return data;
}

export async function markEpisodeWatched(tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<void> {
  await api.put(`/media/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`);
}

export async function unmarkEpisodeWatched(tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<void> {
  await api.delete(`/media/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`);
}

export async function markSeasonWatched(tmdbId: number, seasonNumber: number): Promise<void> {
  await api.post(`/media/tv/${tmdbId}/season/${seasonNumber}/mark-all`);
}

export async function getShowProgress(tmdbId: number): Promise<ShowProgress> {
  const { data } = await api.get<ShowProgress>(`/media/tv/${tmdbId}/progress`);
  return data;
}

export async function rateEpisode(tmdbId: number, seasonNumber: number, episodeNumber: number, rating: number): Promise<void> {
  await api.put(`/media/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/rating`, { rating });
}

export async function clearEpisodeRating(tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<void> {
  await api.delete(`/media/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/rating`);
}
