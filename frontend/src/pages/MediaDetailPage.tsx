import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getMediaDetail, getWatchProviders, type MediaType } from "../lib/media";

export function MediaDetailPage() {
  const { mediaType, tmdbId } = useParams<{ mediaType: string; tmdbId: string }>();
  const type = mediaType as MediaType;
  const id = Number(tmdbId);

  const detailQuery = useQuery({
    queryKey: ["media-detail", type, id],
    queryFn: () => getMediaDetail(type, id),
    enabled: Boolean(type) && Number.isFinite(id),
  });

  const providersQuery = useQuery({
    queryKey: ["media-providers", type, id],
    queryFn: () => getWatchProviders(type, id, "BR"),
    enabled: Boolean(type) && Number.isFinite(id),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">
        Carregando...
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
        <p className="text-red-400">Não foi possível carregar este título.</p>
        <Link to="/" className="text-purple-400 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  const media = detailQuery.data;
  const year = media.release_date?.slice(0, 4);
  const providers = providersQuery.data;
  const hasProviders =
    providers && (providers.flatrate.length > 0 || providers.rent.length > 0 || providers.buy.length > 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {media.backdrop_url && (
        <div
          className="h-64 sm:h-80 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${media.backdrop_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 -mt-24 relative flex flex-col sm:flex-row gap-6 pb-10">
        <div className="w-40 sm:w-56 shrink-0 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 self-start">
          {media.poster_url ? (
            <img src={media.poster_url} alt={media.title} className="w-full h-full object-cover" />
          ) : (
            <div className="aspect-[2/3] flex items-center justify-center text-xs text-neutral-500">
              Sem pôster
            </div>
          )}
        </div>

        <div className="flex-1 pt-2 sm:pt-24">
          <Link to="/" className="text-sm text-purple-400 hover:underline">
            ← Voltar
          </Link>

          <h1 className="text-3xl font-semibold mt-2">
            {media.title} {year && <span className="text-neutral-500 font-normal">({year})</span>}
          </h1>

          <div className="flex flex-wrap gap-2 mt-3">
            {media.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2 py-1 rounded-full border border-neutral-700 text-neutral-300"
              >
                {genre}
              </span>
            ))}
          </div>

          <p className="text-sm text-neutral-400 mt-3">
            {media.media_type === "movie" ? "Filme" : "Série"}
            {media.runtime ? ` · ${media.runtime} min` : ""}
            {media.vote_average ? ` · ⭐ ${media.vote_average.toFixed(1)}` : ""}
          </p>

          <p className="mt-4 leading-relaxed text-neutral-200">{media.overview || "Sem sinopse disponível."}</p>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">Onde assistir ({providers?.region ?? "BR"})</h2>
            {providersQuery.isLoading && <p className="text-sm text-neutral-500">Carregando...</p>}
            {!providersQuery.isLoading && !hasProviders && (
              <p className="text-sm text-neutral-500">Nenhuma plataforma encontrada para esta região.</p>
            )}
            {hasProviders && (
              <div className="flex flex-wrap gap-3">
                {[...providers!.flatrate, ...providers!.rent, ...providers!.buy].map((p, idx) => (
                  <div
                    key={`${p.provider_name}-${idx}`}
                    title={p.provider_name}
                    className="flex items-center gap-2 rounded-md border border-neutral-700 px-2 py-1"
                  >
                    {p.logo_url && (
                      <img src={p.logo_url} alt={p.provider_name} className="w-6 h-6 rounded" />
                    )}
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
