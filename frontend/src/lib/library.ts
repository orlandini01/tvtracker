import { api } from "./api";
import type { MediaType } from "./media";

export type WatchStatus = "quero_assistir" | "assistindo" | "assistido" | "abandonei";

// Chaves de tradução (não o texto em si) — cada componente resolve o texto
// de verdade com t(STATUS_LABEL_KEYS[status]) no idioma ativo.
export const STATUS_LABEL_KEYS: Record<WatchStatus, string> = {
  quero_assistir: "status.quero_assistir",
  assistindo: "status.assistindo",
  assistido: "status.assistido",
  abandonei: "status.abandonei",
};

export type LibraryEntry = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  status: WatchStatus | null;
  is_favorite: boolean;
  rating: number | null;
  watched_at: string | null;
  rewatch_count: number;
  updated_at: string;
};

export type LibraryEntryUpdate = {
  status?: WatchStatus | null;
  is_favorite?: boolean;
  rating?: number | null;
};

export async function getLibraryEntry(mediaType: MediaType, tmdbId: number): Promise<LibraryEntry> {
  const { data } = await api.get<LibraryEntry>(`/library/${mediaType}/${tmdbId}`);
  return data;
}

export async function upsertLibraryEntry(
  mediaType: MediaType,
  tmdbId: number,
  update: LibraryEntryUpdate,
): Promise<LibraryEntry> {
  const { data } = await api.put<LibraryEntry>(`/library/${mediaType}/${tmdbId}`, update);
  return data;
}

export async function deleteLibraryEntry(mediaType: MediaType, tmdbId: number): Promise<void> {
  await api.delete(`/library/${mediaType}/${tmdbId}`);
}

export async function markRewatch(mediaType: MediaType, tmdbId: number): Promise<LibraryEntry> {
  const { data } = await api.post<LibraryEntry>(`/library/${mediaType}/${tmdbId}/rewatch`, {});
  return data;
}

export async function listLibrary(filters?: {
  status?: WatchStatus;
  favoritesOnly?: boolean;
}): Promise<LibraryEntry[]> {
  const { data } = await api.get<{ results: LibraryEntry[] }>("/library", {
    params: {
      status: filters?.status,
      favorites_only: filters?.favoritesOnly || undefined,
    },
  });
  return data.results;
}
