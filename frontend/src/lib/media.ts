import { api } from "./api";

export type MediaType = "movie" | "tv";

export type MediaSummary = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_url: string | null;
  release_date: string | null;
  vote_average: number | null;
};

export type MediaListResponse = {
  page: number;
  total_pages: number;
  results: MediaSummary[];
};

export type SeasonSummary = {
  season_number: number;
  name: string;
  episode_count: number;
};

export type CastMember = {
  name: string;
  character: string;
  profile_url: string | null;
};

export type MediaDetail = MediaSummary & {
  backdrop_url: string | null;
  genres: string[];
  runtime: number | null;
  number_of_seasons: number | null;
  status: string | null;
  seasons: SeasonSummary[] | null;
  trailer_key: string | null;
  cast: CastMember[];
};

export type WatchProvider = {
  provider_name: string;
  logo_url: string | null;
};

export type WatchProvidersResponse = {
  region: string;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};

export const DISCOVER_CATEGORIES = [
  { value: "popular_movies", label: "Filmes populares" },
  { value: "popular_tv", label: "Séries populares" },
  { value: "now_playing", label: "Em cartaz" },
  { value: "upcoming", label: "Em breve" },
  { value: "on_the_air", label: "Séries no ar" },
] as const;

export async function searchMedia(query: string, page = 1): Promise<MediaListResponse> {
  const { data } = await api.get<MediaListResponse>("/media/search", { params: { query, page } });
  return data;
}

export async function discoverMedia(category: string, page = 1): Promise<MediaListResponse> {
  const { data } = await api.get<MediaListResponse>(`/media/discover/${category}`, { params: { page } });
  return data;
}

export async function getMediaDetail(mediaType: MediaType, tmdbId: number): Promise<MediaDetail> {
  const { data } = await api.get<MediaDetail>(`/media/${mediaType}/${tmdbId}`);
  return data;
}

export async function getWatchProviders(
  mediaType: MediaType,
  tmdbId: number,
  region = "BR",
): Promise<WatchProvidersResponse> {
  const { data } = await api.get<WatchProvidersResponse>(`/media/${mediaType}/${tmdbId}/providers`, {
    params: { region },
  });
  return data;
}

export type WatchProviderCatalogItem = {
  provider_id: number;
  provider_name: string;
  logo_url: string | null;
};

export async function getProviderCatalog(mediaType: MediaType, region = "BR"): Promise<WatchProviderCatalogItem[]> {
  const { data } = await api.get<{ results: WatchProviderCatalogItem[] }>("/media/providers/catalog", {
    params: { media_type: mediaType, region },
  });
  return data.results;
}

export async function discoverByProviders(
  mediaType: MediaType,
  providerIds: number[],
  page = 1,
  region = "BR",
): Promise<MediaListResponse> {
  const { data } = await api.get<MediaListResponse>("/media/discover-by-provider", {
    params: { media_type: mediaType, providers: providerIds.join(","), region, page },
  });
  return data;
}

export type GenreItem = {
  id: number;
  name: string;
};

export async function getGenres(mediaType: MediaType): Promise<GenreItem[]> {
  const { data } = await api.get<{ results: GenreItem[] }>("/media/genres", {
    params: { media_type: mediaType },
  });
  return data.results;
}

export type DiscoverFilteredParams = {
  mediaType: MediaType;
  genreIds?: number[];
  year?: number | null;
  minRating?: number | null;
  providerIds?: number[];
  page?: number;
  region?: string;
};

export async function discoverFiltered(params: DiscoverFilteredParams): Promise<MediaListResponse> {
  const { data } = await api.get<MediaListResponse>("/media/discover-filtered", {
    params: {
      media_type: params.mediaType,
      genres: params.genreIds && params.genreIds.length > 0 ? params.genreIds.join(",") : undefined,
      year: params.year ?? undefined,
      min_rating: params.minRating ?? undefined,
      providers: params.providerIds && params.providerIds.length > 0 ? params.providerIds.join(",") : undefined,
      region: params.region ?? "BR",
      page: params.page ?? 1,
    },
  });
  return data;
}
