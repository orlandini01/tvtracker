import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMediaDetail, getWatchProviders, type MediaType } from "../lib/media";
import {
  deleteLibraryEntry,
  getLibraryEntry,
  upsertLibraryEntry,
  STATUS_LABEL_KEYS,
  type LibraryEntryUpdate,
  type WatchStatus,
} from "../lib/library";
import { deleteComment, getComments, postComment } from "../lib/comments";
import {
  clearEpisodeRating,
  getSeasonEpisodes,
  getShowProgress,
  markEpisodeWatched,
  markSeasonWatched,
  rateEpisode,
  unmarkEpisodeWatched,
} from "../lib/episodes";
import { addListItem, getListMembership, getLists, removeListItem, type CustomListSummary } from "../lib/lists";
import { btnAccentSmall, btnDanger, btnDangerSmall, btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

const STATUS_OPTIONS: WatchStatus[] = ["quero_assistir", "assistindo", "assistido", "abandonei"];
const RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

function ListMembershipRow({
  list,
  mediaType,
  tmdbId,
  isMember,
  membershipLoading,
}: {
  list: CustomListSummary;
  mediaType: MediaType;
  tmdbId: number;
  isMember: boolean;
  membershipLoading: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["list-membership", mediaType, tmdbId] });
    queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
  }

  const addMutation = useMutation({
    mutationFn: () => addListItem(list.id, mediaType, tmdbId),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => removeListItem(list.id, mediaType, tmdbId),
    onSuccess: invalidate,
  });

  const pending = addMutation.isPending || removeMutation.isPending || membershipLoading;

  return (
    <label className="flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-2 cursor-pointer hover:border-neutral-600">
      <input
        type="checkbox"
        checked={isMember}
        disabled={pending}
        onChange={() => (isMember ? removeMutation.mutate() : addMutation.mutate())}
        className="accent-purple-600"
      />
      <span className="text-sm flex-1">{list.name}</span>
      {pending && <span className="text-xs text-neutral-500">{t("common.loading")}</span>}
    </label>
  );
}

export function MediaDetailPage() {
  const { t } = useTranslation();
  const { mediaType, tmdbId } = useParams<{ mediaType: string; tmdbId: string }>();
  const type = mediaType as MediaType;
  const id = Number(tmdbId);
  const queryClient = useQueryClient();

  const enabled = Boolean(type) && Number.isFinite(id);

  const detailQuery = useQuery({
    queryKey: ["media-detail", type, id],
    queryFn: () => getMediaDetail(type, id),
    enabled,
    // Sinopse/gêneros/elenco praticamente não mudam — cacheia por mais
    // tempo pra abrir instantâneo ao voltar num título já visitado.
    staleTime: 10 * 60 * 1000,
  });

  const providersQuery = useQuery({
    queryKey: ["media-providers", type, id],
    queryFn: () => getWatchProviders(type, id, "BR"),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const customListsQuery = useQuery({
    queryKey: ["custom-lists"],
    queryFn: getLists,
    enabled,
  });

  const membershipQuery = useQuery({
    queryKey: ["list-membership", type, id],
    queryFn: () => getListMembership(type, id),
    enabled,
  });
  const memberListIds = new Set(membershipQuery.data ?? []);

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

  const [commentInput, setCommentInput] = useState("");

  const commentsQuery = useQuery({
    queryKey: ["comments", type, id],
    queryFn: () => getComments(type, id),
    enabled,
  });

  const postCommentMutation = useMutation({
    mutationFn: (body: string) => postComment(type, id, body),
    onSuccess: () => {
      setCommentInput("");
      queryClient.invalidateQueries({ queryKey: ["comments", type, id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", type, id] });
    },
  });

  function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    postCommentMutation.mutate(trimmed);
  }

  const isTv = type === "tv";
  const [selectedSeason, setSelectedSeason] = useState(1);

  const progressQuery = useQuery({
    queryKey: ["show-progress", id],
    queryFn: () => getShowProgress(id),
    enabled: enabled && isTv,
  });

  const seasonQuery = useQuery({
    queryKey: ["season-episodes", id, selectedSeason],
    queryFn: () => getSeasonEpisodes(id, selectedSeason),
    enabled: enabled && isTv,
  });

  function invalidateEpisodeQueries() {
    queryClient.invalidateQueries({ queryKey: ["season-episodes", id, selectedSeason] });
    queryClient.invalidateQueries({ queryKey: ["show-progress", id] });
  }

  const markEpisodeMutation = useMutation({
    mutationFn: (episodeNumber: number) => markEpisodeWatched(id, selectedSeason, episodeNumber),
    onSuccess: invalidateEpisodeQueries,
  });

  const unmarkEpisodeMutation = useMutation({
    mutationFn: (episodeNumber: number) => unmarkEpisodeWatched(id, selectedSeason, episodeNumber),
    onSuccess: invalidateEpisodeQueries,
  });

  const markSeasonMutation = useMutation({
    mutationFn: () => markSeasonWatched(id, selectedSeason),
    onSuccess: invalidateEpisodeQueries,
  });

  const rateEpisodeMutation = useMutation({
    mutationFn: ({ episodeNumber, rating }: { episodeNumber: number; rating: number }) =>
      rateEpisode(id, selectedSeason, episodeNumber, rating),
    onSuccess: invalidateEpisodeQueries,
  });

  const clearEpisodeRatingMutation = useMutation({
    mutationFn: (episodeNumber: number) => clearEpisodeRating(id, selectedSeason, episodeNumber),
    onSuccess: invalidateEpisodeQueries,
  });

  function toggleEpisode(episodeNumber: number, watched: boolean) {
    if (watched) {
      unmarkEpisodeMutation.mutate(episodeNumber);
    } else {
      markEpisodeMutation.mutate(episodeNumber);
    }
  }

  function handleEpisodeRatingChange(episodeNumber: number, value: string) {
    if (value === "") {
      clearEpisodeRatingMutation.mutate(episodeNumber);
    } else {
      rateEpisodeMutation.mutate({ episodeNumber, rating: Number(value) });
    }
  }

  if (detailQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">{t("mediaDetail.loading")}</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
        <p className="text-red-400">{t("mediaDetail.not_found")}</p>
        <Link to="/" className={btnSecondary}>
          {t("mediaDetail.back")}
        </Link>
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
            <div className="aspect-[2/3] flex items-center justify-center text-xs text-neutral-500">{t("mediaCard.no_poster")}</div>
          )}
        </div>
        <div className="flex-1 pt-2 sm:pt-24">
          <Link to="/" className={`${btnSecondary} inline-block bg-neutral-900/80`}>
            {t("mediaDetail.back")}
          </Link>

          <div className="flex items-start justify-between gap-3 mt-2">
            <h1 className="text-3xl font-semibold">
              {media.title} {year && <span className="text-neutral-500 font-normal">({year})</span>}
            </h1>
            <button
              onClick={toggleFavorite}
              disabled={upsertMutation.isPending}
              title={entry?.is_favorite ? t("mediaDetail.favorite_remove_title") : t("mediaDetail.favorite_add_title")}
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
            {media.media_type === "movie" ? t("mediaDetail.type_movie") : t("mediaDetail.type_tv")}
            {media.runtime ? ` · ${media.runtime} min` : ""}
            {media.vote_average ? ` · ⭐ ${media.vote_average.toFixed(1)} (TMDB)` : ""}
          </p>

          <p className="mt-4 leading-relaxed text-neutral-200">{media.overview || t("mediaDetail.no_synopsis")}</p>

          {media.trailer_key && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.trailer_heading")}</h2>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-neutral-800">
                <iframe
                  src={`https://www.youtube.com/embed/${media.trailer_key}`}
                  title={t("mediaDetail.trailer_heading")}
                  className="w-full h-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {media.cast.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.cast_heading")}</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {media.cast.map((member, idx) => (
                  <div key={`${member.name}-${idx}`} className="w-24 shrink-0 text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border border-neutral-800">
                      {member.profile_url ? (
                        <img src={member.profile_url} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-600">👤</div>
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate" title={member.name}>{member.name}</p>
                    <p className="text-xs text-neutral-500 truncate" title={member.character}>{member.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.my_status")}</h2>
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
                  {t(STATUS_LABEL_KEYS[s])}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.my_rating")}</h2>
            <div className="flex flex-wrap gap-1">
              {RATING_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  disabled={upsertMutation.isPending}
                  title={t("mediaDetail.rating_title", { n })}
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
              className={`mt-4 ${btnDanger}`}
            >
              {t("mediaDetail.remove_from_list")}
            </button>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-medium text-neutral-400">{t("mediaDetail.custom_lists_heading")}</h2>
              <Link to="/listas" className={btnSecondarySmall}>
                {t("mediaDetail.manage_lists_link")}
              </Link>
            </div>
            {customListsQuery.isLoading && <p className="text-xs text-neutral-500">{t("lists.loading")}</p>}
            {customListsQuery.data && customListsQuery.data.length === 0 && (
              <p className="text-xs text-neutral-500">{t("mediaDetail.no_custom_lists")}</p>
            )}
            <div className="flex flex-col gap-2">
              {customListsQuery.data?.map((list) => (
                <ListMembershipRow
                  key={list.id}
                  list={list}
                  mediaType={type}
                  tmdbId={id}
                  isMember={memberListIds.has(list.id)}
                  membershipLoading={membershipQuery.isLoading}
                />
              ))}
            </div>
          </div>

          {isTv && media.seasons && media.seasons.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-sm font-medium text-neutral-400">{t("mediaDetail.episodes")}</h2>
                {progressQuery.data && (
                  <span className="text-xs text-neutral-500">
                    {t("mediaDetail.watched_count", { watched: progressQuery.data.watched_count, total: progressQuery.data.total_count })}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {media.seasons.map((s) => (
                  <button
                    key={s.season_number}
                    onClick={() => setSelectedSeason(s.season_number)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      selectedSeason === s.season_number
                        ? "bg-purple-600 border-purple-500"
                        : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {seasonQuery.isLoading && <p className="text-sm text-neutral-500">{t("mediaDetail.loading_episodes")}</p>}
              {seasonQuery.isError && <p className="text-sm text-red-400">{t("mediaDetail.episodes_error")}</p>}

              {seasonQuery.data && (
                <>
                  <button
                    onClick={() => markSeasonMutation.mutate()}
                    disabled={markSeasonMutation.isPending}
                    className={`mb-3 ${btnAccentSmall}`}
                  >
                    {t("mediaDetail.mark_season_watched")}
                  </button>

                  <ul className="flex flex-col gap-2">
                    {seasonQuery.data.episodes.map((ep) => (
                      <li
                        key={ep.episode_number}
                        className="flex items-center gap-3 rounded-lg border border-neutral-800 p-2"
                      >
                        <button
                          onClick={() => toggleEpisode(ep.episode_number, ep.watched)}
                          disabled={markEpisodeMutation.isPending || unmarkEpisodeMutation.isPending}
                          title={ep.watched ? t("mediaDetail.mark_unwatched_title") : t("mediaDetail.mark_watched_title")}
                          className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center text-xs ${
                            ep.watched ? "bg-purple-600 border-purple-500" : "border-neutral-600 hover:border-neutral-400"
                          }`}
                        >
                          {ep.watched ? "✓" : ""}
                        </button>
                        {ep.still_url && (
                          <img src={ep.still_url} alt={ep.name} className="hidden sm:block w-20 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">
                            {ep.episode_number}. {ep.name}
                          </p>
                          {ep.air_date && <p className="text-xs text-neutral-500">{ep.air_date}</p>}
                        </div>
                        <select
                          value={ep.rating ?? ""}
                          onChange={(e) => handleEpisodeRatingChange(ep.episode_number, e.target.value)}
                          disabled={rateEpisodeMutation.isPending || clearEpisodeRatingMutation.isPending}
                          title={t("mediaDetail.episode_rating_title")}
                          aria-label={t("mediaDetail.episode_rating_title")}
                          className={`shrink-0 rounded-md border bg-neutral-900 text-xs px-1.5 py-1 ${
                            ep.rating != null ? "border-yellow-500 text-yellow-400" : "border-neutral-700 text-neutral-400"
                          }`}
                        >
                          <option value="">{t("mediaDetail.episode_rating_empty")}</option>
                          {RATING_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.where_to_watch", { region: providers?.region ?? "BR" })}</h2>
            {providersQuery.isLoading && <p className="text-sm text-neutral-500">{t("mediaDetail.providers_loading")}</p>}
            {!providersQuery.isLoading && !hasProviders && <p className="text-sm text-neutral-500">{t("mediaDetail.providers_empty")}</p>}
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

          <div className="mt-8">
            <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("mediaDetail.comments")}</h2>
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={t("mediaDetail.comment_placeholder")}
                maxLength={1000}
                className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={postCommentMutation.isPending || !commentInput.trim()}
                className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium"
              >
                {t("mediaDetail.comment_submit")}
              </button>
            </form>

            {commentsQuery.isLoading && <p className="text-sm text-neutral-500">{t("mediaDetail.comments_loading")}</p>}
            {commentsQuery.isError && <p className="text-sm text-red-400">{t("mediaDetail.comments_error")}</p>}
            {commentsQuery.data && commentsQuery.data.length === 0 && (
              <p className="text-sm text-neutral-500">{t("mediaDetail.comments_empty")}</p>
            )}

            <ul className="flex flex-col gap-3">
              {commentsQuery.data?.map((comment) => (
                <li key={comment.id} className="rounded-lg border border-neutral-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-purple-400">{comment.user.username}</span>
                    {comment.is_mine && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        disabled={deleteCommentMutation.isPending}
                        className={btnDangerSmall}
                      >
                        {t("mediaDetail.comment_remove")}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-neutral-200 mt-1">{comment.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <footer className="px-6 py-4 text-center text-xs text-neutral-600">
        {t("home.footer_tmdb")}
      </footer>
    </div>
  );
}
