import { api } from "./api";
import type { MediaType } from "./media";

export type CustomListSummary = {
  id: string;
  name: string;
  created_at: string;
  item_count: number;
};

export type CustomListItem = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  added_at: string;
};

export type CustomListDetail = {
  id: string;
  name: string;
  created_at: string;
  items: CustomListItem[];
};

export async function getLists(): Promise<CustomListSummary[]> {
  const { data } = await api.get<{ results: CustomListSummary[] }>("/lists");
  return data.results;
}

export async function createList(name: string): Promise<CustomListSummary> {
  const { data } = await api.post<CustomListSummary>("/lists", { name });
  return data;
}

export async function getListDetail(listId: string): Promise<CustomListDetail> {
  const { data } = await api.get<CustomListDetail>(`/lists/${listId}`);
  return data;
}

export async function renameList(listId: string, name: string): Promise<CustomListDetail> {
  const { data } = await api.patch<CustomListDetail>(`/lists/${listId}`, { name });
  return data;
}

export async function deleteList(listId: string): Promise<void> {
  await api.delete(`/lists/${listId}`);
}

export async function addListItem(listId: string, mediaType: MediaType, tmdbId: number): Promise<CustomListDetail> {
  const { data } = await api.post<CustomListDetail>(`/lists/${listId}/items`, { media_type: mediaType, tmdb_id: tmdbId });
  return data;
}

export async function removeListItem(listId: string, mediaType: MediaType, tmdbId: number): Promise<CustomListDetail> {
  const { data } = await api.delete<CustomListDetail>(`/lists/${listId}/items/${mediaType}/${tmdbId}`);
  return data;
}

// Em quais listas um título já está — 1 request no lugar de 1-por-lista
// (era um N+1: a página de detalhe buscava o detalhe completo de cada
// lista do usuário só pra saber se o checkbox devia vir marcado).
export async function getListMembership(mediaType: MediaType, tmdbId: number): Promise<string[]> {
  const { data } = await api.get<{ list_ids: string[] }>("/lists/membership", {
    params: { media_type: mediaType, tmdb_id: tmdbId },
  });
  return data.list_ids;
}
