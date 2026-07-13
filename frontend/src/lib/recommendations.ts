import { api } from "./api";
import type { MediaSummary } from "./media";

export type RecommendationsResponse = {
  movies: MediaSummary[];
  shows: MediaSummary[];
};

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const { data } = await api.get<RecommendationsResponse>("/recommendations");
  return data;
}
