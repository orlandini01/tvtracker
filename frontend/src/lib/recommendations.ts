import { api } from "./api";
import type { MediaSummary } from "./media";

export type RecommendationsResponse = {
  movies: MediaSummary[];
  shows: MediaSummary[];
};

export type Mood = "feliz" | "triste" | "emocionante" | "assustador" | "relaxante" | "reflexivo";

export const MOODS: Mood[] = ["feliz", "triste", "emocionante", "assustador", "relaxante", "reflexivo"];

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const { data } = await api.get<RecommendationsResponse>("/recommendations");
  return data;
}

export async function getMoodRecommendations(mood: Mood): Promise<RecommendationsResponse> {
  const { data } = await api.get<RecommendationsResponse>(`/recommendations/mood/${mood}`);
  return data;
}
