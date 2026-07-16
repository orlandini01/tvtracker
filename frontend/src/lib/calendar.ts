import { api } from "./api";
import type { MediaType } from "./media";

export type CalendarItem = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  date: string;
  kind: "movie_release" | "episode";
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
};

export async function getCalendar(): Promise<CalendarItem[]> {
  const { data } = await api.get<{ results: CalendarItem[] }>("/calendar");
  return data.results;
}
