import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { deleteList, getListDetail, removeListItem, renameList } from "../lib/lists";

export function ListDetailPage() {
  const { t } = useTranslation();
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const detailQuery = useQuery({
    queryKey: ["custom-list", listId],
    queryFn: () => getListDetail(listId as string),
    enabled: Boolean(listId),
  });

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
    return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">{t("lists.loading")}</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
        <p className="text-red-400">{t("lists.not_found")}</p>
        <Link to="/listas" className="text-purple-400 hover:underline">{t("lists.back")}</Link>
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
              className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-sm font-medium"
            >
              {t("lists.save_name")}
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="rounded-md border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 text-sm"
            >
              {t("common.cancel")}
            </button>
          </form>
        ) : (
          <h1 className="text-2xl font-semibold">{list.name}</h1>
        )}
        <Link to="/listas" className="text-sm text-purple-400 hover:underline shrink-0">{t("lists.back")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto">
        {!renaming && (
          <div className="flex gap-4 mb-6">
            <button onClick={startRenaming} className="text-xs text-purple-400 hover:underline">
              {t("lists.rename_button")}
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="text-xs text-red-400 hover:underline">
              {t("lists.delete_button")}
            </button>
          </div>
        )}

        {list.items.length === 0 && <p className="text-sm text-neutral-500">{t("lists.detail_empty")}</p>}

        <ul className="flex flex-col gap-3">
          {list.items.map((item) => (
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
                className="text-xs text-red-400 hover:underline shrink-0"
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
