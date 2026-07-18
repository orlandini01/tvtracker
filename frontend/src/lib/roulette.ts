import { api } from "./api";
import type { MediaType } from "./media";

export type RouletteResult = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
};

export async function spinRoulette(listId?: string): Promise<RouletteResult | null> {
  const { data } = await api.get<{ result: RouletteResult | null }>("/roulette", {
    params: listId ? { list_id: listId } : undefined,
  });
  return data.result;
}
