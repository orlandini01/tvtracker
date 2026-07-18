import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  addListMember,
  deleteList,
  getListDetail,
  removeListItem,
  removeListMember,
  renameList,
  type CustomListItem,
} from "../lib/lists";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { btnDangerSmall, btnPrimarySmall, btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

// Client-side pois o detalhe da lista já vem inteiro num único request.
type SortValue = "added_desc" | "added_asc" | "rating" | "title";

const SORTS: { value: SortValue; labelKey: string }[] = [
  { value: "added_desc", labelKey: "lists.sort_added_desc" },
  { value: "added_asc", labelKey: "lists.sort_added_asc" },
  { value: "rating", labelKey: "lists.sort_rating" },
  { value: "title", labelKey: "lists.sort_title" },
];

function sortItems(items: CustomListItem[], sort: SortValue): CustomListItem[] {
  const sorted = [...items];
  switch (sort) {
    case "added_asc":
      sorted.sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime());
      break;
    case "rating":
      // sem nota vai pro final, não pro topo (null tratado como -1)
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "added_desc":
    default:
      sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
      break;
  }
  return sorted;
}

export function ListDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [sort, setSort] = useState<SortValue>("added_desc");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["custom-list", listId],
    queryFn: () => getListDetail(listId as string),
    enabled: Boolean(listId),
  });

  const sortedItems = useMemo(
    () => (detailQuery.data ? sortItems(detailQuery.data.items, sort) : []),
    [detailQuery.data, sort],
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["custom-list", listId] });
    queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
  }

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameList(listId as string, name),
    onSuccess: () => {
      setRenaming(false);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(listId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      navigate("/listas");
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ mediaType, tmdbId }: { mediaType: "movie" | "tv"; tmdbId: number }) =>
      removeListItem(listId as string, mediaType, tmdbId),
    onSuccess: invalidate,
  });

  const inviteMutation = useMutation({
    mutationFn: (username: string) => addListMember(listId as string, username),
    onSuccess: () => {
      setInviteUsername("");
      setInviteError(null);
      setShowInvite(false);
      invalidate();
    },
    onError: (err: any) => {
      setInviteError(err?.response?.data?.detail ?? t("lists.invite_error"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeListMember(listId as string, memberId),
    onSuccess: invalidate,
  });

  const leaveMutation = useMutation({
    mutationFn: () => removeListMember(listId as string, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      navigate("/listas");
    },
  });

  function startRenaming() {
    setNameInput(detailQuery.data?.name ?? "");
    setRenaming(true);
  }

  function handleRenameSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    renameMutation.mutate(trimmed);
  }

  function handleDelete() {
    if (window.confirm(t("lists.delete_confirm"))) {
      deleteMutation.mutate();
    }
  }

  function handleLeave() {
    if (window.confirm(t("lists.leave_confirm"))) {
      leaveMutation.mutate();
    }
  }

  function handleInviteSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inviteUsername.trim();
    if (!trimmed) return;
    inviteMutation.mutate(trimmed);
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
          <div className="h-7 w-40 rounded-md bg-neutral-800 animate-pulse" />
          <Link to="/listas" className={btnSecondary}>{t("lists.back")}</Link>
        </header>
        <main className="px-6 py-6 max-w-2xl mx-auto">
          <SkeletonRows count={4} />
        </main>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
        <p className="text-red-400">{t("lists.not_found")}</p>
        <Link to="/listas" className={btnSecondary}>{t("lists.back")}</Link>
      </div>
    );
  }

  const list = detailQuery.data;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        {renaming ? (
          <form onSubmit={handleRenameSubmit} className="flex gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={100}
              autoFocus
              className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-lg outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={renameMutation.isPending || !nameInput.trim()}
              className={btnPrimarySmall}
            >
              {t("lists.save_name")}
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className={btnSecondarySmall}
            >
              {t("common.cancel")}
            </button>
          </form>
        ) : (
          <h1 className="text-2xl font-semibold">{list.name}</h1>
        )}
        <Link to="/listas" className={`${btnSecondary} shrink-0`}>{t("lists.back")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto">
        {!renaming && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-2">
              {list.is_owner ? (
                <>
                  <button onClick={startRenaming} className={btnSecondarySmall}>
                    {t("lists.rename_button")}
                  </button>
                  <button onClick={handleDelete} disabled={deleteMutation.isPending} className={btnDangerSmall}>
                    {t("lists.delete_button")}
                  </button>
                </>
              ) : (
                <button onClick={handleLeave} disabled={leaveMutation.isPending} className={btnDangerSmall}>
                  {t("lists.leave_button")}
                </button>
              )}
            </div>

            {list.items.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-neutral-400 shrink-0">
                {t("lists.sort_heading")}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                  className="rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-purple-500"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-neutral-800 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{t("lists.members_heading")}</h2>
            {list.is_owner && !showInvite && (
              <button onClick={() => setShowInvite(true)} className={btnSecondarySmall}>
                {t("lists.invite_button")}
              </button>
            )}
          </div>

          {showInvite && (
            <form onSubmit={handleInviteSubmit} className="flex gap-2 mb-3">
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder={t("lists.invite_placeholder")}
                maxLength={50}
                autoFocus
                className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm outline-none focus:border-purple-500"
              />
              <button type="submit" disabled={inviteMutation.isPending || !inviteUsername.trim()} className={btnPrimarySmall}>
                {t("lists.invite_submit")}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className={btnSecondarySmall}>
                {t("common.cancel")}
              </button>
            </form>
          )}
          {inviteError && <p className="text-sm text-red-400 mb-2">{inviteError}</p>}

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-full bg-neutral-900 pl-1 pr-3 py-1">
              <Avatar username={list.owner.username} avatarUrl={list.owner.avatar_url} size="sm" />
              <span className="text-sm">{list.owner.username}</span>
              <span className="text-xs text-neutral-500">{t("lists.owner_badge")}</span>
            </div>
            {list.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-full bg-neutral-900 pl-1 pr-2 py-1">
                <Avatar username={m.username} avatarUrl={m.avatar_url} size="sm" />
                <span className="text-sm">{m.username}</span>
                {list.is_owner && (
                  <button
                    onClick={() => removeMemberMutation.mutate(m.id)}
                    disabled={removeMemberMutation.isPending}
                    className="text-neutral-500 hover:text-red-400 text-xs"
                    title={t("lists.remove_member_title")}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {list.items.length === 0 && <EmptyState icon="📼" message={t("lists.detail_empty")} />}

        <ul className="flex flex-col gap-3 fade-in">
          {sortedItems.map((item) => (
            <li key={`${item.media_type}-${item.tmdb_id}`} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
              <Link to={`/media/${item.media_type}/${item.tmdb_id}`} className="shrink-0 w-12 h-18 rounded overflow-hidden bg-neutral-800">
                {item.poster_url && <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />}
              </Link>
              <Link to={`/media/${item.media_type}/${item.tmdb_id}`} className="flex-1 font-medium text-purple-400 hover:underline">
                {item.title}
              </Link>
              <button
                onClick={() => removeItemMutation.mutate({ mediaType: item.media_type, tmdbId: item.tmdb_id })}
                disabled={removeItemMutation.isPending}
                className={`${btnDangerSmall} shrink-0`}
              >
                {t("lists.remove_item")}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
