import { api } from "./api";
import type { MediaType } from "./media";

export type WatchStatus = "quero_assistir" | "assistindo" | "assistido" | "abandonei";

export const STATUS_LABELS: Record<WatchStatus, string> = {
  quero_assistir: "Quero assistir",
  assistindo: "Assistindo",
  assistido: "Assistido",
  abandonei: "Abandonei",
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
