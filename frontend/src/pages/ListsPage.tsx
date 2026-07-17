import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { createList, getLists } from "../lib/lists";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { btnPrimary, btnSecondary } from "../lib/buttonStyles";

export function ListsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [nameInput, setNameInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listsQuery = useQuery({
    queryKey: ["custom-lists"],
    queryFn: getLists,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createList(name),
    onSuccess: () => {
      setNameInput("");
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
    },
    onError: (err: any) => {
      setFeedback(err?.response?.data?.detail ?? i18n.t("lists.create_error"));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  const lists = listsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("lists.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={t("lists.new_list_placeholder")}
            maxLength={100}
            className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !nameInput.trim()}
            className={btnPrimary}
          >
            {t("lists.create_button")}
          </button>
        </form>

        {feedback && <p className="text-sm text-red-400">{feedback}</p>}

        {listsQuery.isLoading && <SkeletonRows count={3} />}
        {listsQuery.isError && <p className="text-sm text-red-400">{t("lists.error")}</p>}
        {listsQuery.data && lists.length === 0 && (
          <EmptyState icon="📋" message={t("lists.empty")} />
        )}

        <ul className="flex flex-col gap-2 fade-in">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                to={`/listas/${l.id}`}
                className="flex items-center justify-between rounded-md border border-neutral-800 hover:border-purple-500 px-3 py-3 transition-colors"
              >
                <span className="text-sm font-medium">{l.name}</span>
                <span className="text-xs text-neutral-500">{t("lists.item_count", { count: l.item_count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
