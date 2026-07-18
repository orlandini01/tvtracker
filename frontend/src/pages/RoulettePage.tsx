import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { spinRoulette, type RouletteResult } from "../lib/roulette";
import { getLists } from "../lib/lists";
import { EmptyState } from "../components/EmptyState";
import { btnPrimary, btnSecondary } from "../lib/buttonStyles";

export function RoulettePage() {
  const { t } = useTranslation();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [result, setResult] = useState<RouletteResult | null | undefined>(undefined);
  const [spinning, setSpinning] = useState(false);

  const listsQuery = useQuery({
    queryKey: ["custom-lists"],
    queryFn: getLists,
  });

  const spinMutation = useMutation({
    mutationFn: () => spinRoulette(selectedListId || undefined),
    onMutate: () => {
      setSpinning(true);
      setResult(undefined);
    },
    onSuccess: (data) => {
      // pequena pausa pra animação de "sorteando" ser perceptível, não só
      // um flash instantâneo de resultado
      setTimeout(() => {
        setResult(data);
        setSpinning(false);
      }, 600);
    },
    onError: () => setSpinning(false),
  });

  const lists = listsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("roulette.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-10 max-w-md mx-auto flex flex-col items-center gap-8 text-center">
        <p className="text-sm text-neutral-400">{t("roulette.description")}</p>

        <label className="w-full flex flex-col gap-2 text-left">
          <span className="text-sm text-neutral-400">{t("roulette.source_label")}</span>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
          >
            <option value="">{t("roulette.source_personal")}</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>

        <div
          className={`w-40 h-40 rounded-full border-4 border-purple-600 flex items-center justify-center text-5xl transition-transform duration-500 ${
            spinning ? "animate-spin" : ""
          }`}
        >
          🎬
        </div>

        <button onClick={() => spinMutation.mutate()} disabled={spinMutation.isPending || spinning} className={btnPrimary}>
          {spinning ? t("roulette.spinning") : t("roulette.spin_button")}
        </button>

        {spinMutation.isError && <p className="text-sm text-red-400">{t("roulette.error")}</p>}

        {result === null && !spinning && <EmptyState icon="🤷" message={t("roulette.empty")} />}

        {result && !spinning && (
          <Link
            to={`/media/${result.media_type}/${result.tmdb_id}`}
            className="w-full flex items-center gap-4 rounded-xl border border-purple-700 bg-purple-950/30 p-4 fade-in"
          >
            <div className="shrink-0 w-16 h-24 rounded overflow-hidden bg-neutral-800">
              {result.poster_url && <img src={result.poster_url} alt={result.title} className="w-full h-full object-cover" />}
            </div>
            <div className="text-left">
              <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">{t("roulette.result_heading")}</p>
              <p className="font-semibold">{result.title}</p>
            </div>
          </Link>
        )}
      </main>
    </div>
  );
}
