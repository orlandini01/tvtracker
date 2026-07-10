import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getMediaDetail, getWatchProviders, type MediaType } from "../lib/media";
import {
  deleteLibraryEntry,
  getLibraryEntry,
  upsertLibraryEntry,
  STATUS_LABELS,
  type LibraryEntryUpdate,
  type WatchStatus,
} from "../lib/library";

const STATUS_OPTIONS: WatchStatus[] = ["quero_assistir", "assistindo", "assistido", "abandonei"];
const RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export function MediaDetailPage() {
  const { mediaType, tmdbId } = useParams<{ mediaType: string; tmdbId: string }>();
  const type = mediaType as MediaType;
  const id = Number(tmdbId);
  const queryClient = useQueryClient();

  const enabled = Boolean(type) && Number.isFinite(id);

  const detailQuery = useQuery({
    queryKey: ["media-detail", type, id],
    queryFn: () => getMediaDetail(type, id),
    enabled,
  });

  const providersQuery = useQuery({
    queryKey: ["media-providers", type, id],
    queryFn: () => getWatchProviders(type, id, "BR"),
    enabled,
  });

  const libraryQuery = useQuery({
    queryKey: ["library-entry", type, id],
    queryFn: () => getLibraryEntry(type, id),
    enabled,
  });

  const upsertMutation = useMutation({
    mutationFn: (update: LibraryEntryUpdate) => upsertLibraryEntry(type, id, update),
    onSuccess: (entry) => {
      queryClient.setQueryData(["library-entry", type, id], entry);
      queryClient.invalidateQueries({ queryKey: ["library-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLibraryEntry(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-entry", type, id] });
      queryClient.invalidateQueries({ queryKey: ["library-list"] });
    },
  });

  if (detailQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">Carregando...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
        <p className="text-red-400">Não foi possível carregar este título.</p>
        <Link to="/" className="text-purple-400 hover:underline">Voltar</Link>
      </div>
    );
  }

  const media = detailQuery.data;
  const year = media.release_date?.slice(0, 4);
  const providers = providersQuery.data;
  const hasProviders = providers && (providers.flatrate.length > 0 || providers.rent.length > 0 || providers.buy.length > 0);

  const entry = libraryQuery.data;
  const hasAnyEntry = Boolean(entry && (entry.status || entry.is_favorite || entry.rating));

  function toggleFavorite() {
    upsertMutation.mutate({ is_favorite: !(entry?.is_favorite ?? false) });
  }

  function setStatus(status: WatchStatus) {
    // clicar de novo no mesmo status ativo remove o status (mas mantem favorito/nota)
    upsertMutation.mutate({ status: entry?.status === status ? null : status });
  }

  function setRating(rating: number) {
    upsertMutation.mutate({ rating: entry?.rating === rating ? null : rating });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {media.backdrop_url && (
        <div className="h-64 sm:h-80 bg-cover bg-center relative" style={{ backgroundImage: `url(${media.backdrop_url})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        </div>
      )}
      <div className="max-w-4xl mx-auto px-6 -mt-24 relative flex flex-col sm:flex-row gap-6 pb-10">
        <div className="w-40 sm:w-56 shrink-0 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 self-start">
          {media.poster_url ? (
            <img src={media.poster_url} alt={media.title} className="w-full h-full object-cover" />
          ) : (
            <div className="aspect-[2/3] flex items-center justify-center text-xs text-neutral-500">Sem pôster</div>
          )}
        </div>
        <div className="flex-1 pt-2 sm:pt-24">
          <Link to="/" className="text-sm text-purple-400 hover:underline">← Voltar</Link>

          <div className="flex items-start justify-between gap-3 mt-2">
            <h1 className="text-3xl font-semibold">
              {media.title} {year && <span className="text-neutral-500 font-normal">({year})</span>}
            </h1>
            <button
              onClick={toggleFavorite}
              disabled={upsertMutation.isPending}
              title={entry?.is_favorite ? "Remover dos favoritos" : "Favoritar"}
              className={`shrink-0 rounded-full border px-3 py-2 text-lg leading-none ${
                entry?.is_favorite ? "bg-pink-600 border-pink-500" : "border-neutral-700 hover:border-pink-500"
              }`}
            >
              {entry?.is_favorite ? "♥" : "♡"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {media.genres.map((genre) => (
              <span key={genre} className="text-xs px-2 py-1 rounded-full border border-neutral-700 text-neutral-300">{genre}</span>
            ))}
          </div>

          <p className="text-sm text-neutral-400 mt-3">
            {media.media_type === "movie" ? "Filme" : "Série"}
            {media.runtime ? ` · ${media.runtime} min` : ""}
            {media.vote_average ? ` · ⭐ ${media.vote_average.toFixed(1)} (TMDB)` : ""}
          </p>

          <p className="mt-4 leading-relaxed text-neutral-200">{media.overview || "Sem sinopse disponível."}</p>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">Meu status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={upsertMutation.isPending}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    entry?.status === s ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">Minha nota</h2>
            <div className="flex flex-wrap gap-1">
              {RATING_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  disabled={upsertMutation.isPending}
                  title={`Nota ${n}`}
                  className={`w-8 h-8 rounded-md border text-sm ${
                    entry?.rating === n ? "bg-yellow-500 border-yellow-400 text-neutral-900 font-semibold" : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {hasAnyEntry && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="mt-4 text-sm text-red-400 hover:underline"
            >
              Remover da minha lista
            </button>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">Onde assistir ({providers?.region ?? "BR"})</h2>
            {providersQuery.isLoading && <p className="text-sm text-neutral-500">Carregando...</p>}
            {!providersQuery.isLoading && !hasProviders && <p className="text-sm text-neutral-500">Nenhuma plataforma encontrada para esta região.</p>}
            {hasProviders && (
              <div className="flex flex-wrap gap-3">
                {[...providers!.flatrate, ...providers!.rent, ...providers!.buy].map((p, idx) => (
                  <div key={`${p.provider_name}-${idx}`} title={p.provider_name} className="flex items-center gap-2 rounded-md border border-neutral-700 px-2 py-1">
                    {p.logo_url && <img src={p.logo_url} alt={p.provider_name} className="w-6 h-6 rounded" />}
                    <span className="text-xs">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="px-6 py-4 text-center text-xs text-neutral-600">
        Dados fornecidos por TMDB. Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
      </footer>
    </div>
  );
}
