import { api } from "./api";

export type GenreCount = { name: string; count: number };
export type PersonCount = { name: string; count: number };

export type AdvancedStats = {
  total_minutes_watched: number;
  longest_streak_days: number;
  top_genres: GenreCount[];
  top_people: PersonCount[];
  movies_watched: number;
  shows_watched: number;
  total_rewatches: number;
};

export async function getAdvancedStats(): Promise<AdvancedStats> {
  const { data } = await api.get<AdvancedStats>("/stats/advanced");
  return data;
}
