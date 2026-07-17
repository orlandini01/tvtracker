import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { deleteList, getListDetail, removeListItem, renameList, type CustomListItem } from "../lib/lists";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
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
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [sort, setSort] = useState<SortValue>("added_desc");

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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex gap-2">
              <button onClick={startRenaming} className={btnSecondarySmall}>
                {t("lists.rename_button")}
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className={btnDangerSmall}>
                {t("lists.delete_button")}
              </button>
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
