import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  createChallenge,
  deleteChallenge,
  getChallenges,
  getLeaderboard,
  type Challenge,
  type ChallengeKind,
} from "../lib/challenges";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { btnDangerSmall, btnPrimary, btnPrimarySmall, btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

const KIND_OPTIONS: ChallengeKind[] = ["movie_count", "episode_count", "genre_count"];

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadgeClass(status: Challenge["status"]): string {
  if (status === "active") return "bg-purple-600 text-white";
  if (status === "upcoming") return "bg-neutral-700 text-neutral-200";
  return "bg-neutral-800 text-neutral-500";
}

function ChallengeCard({ challenge, onOpenLeaderboard, onDelete, canDelete }: {
  challenge: Challenge;
  onOpenLeaderboard: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const pct = challenge.target_count > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target_count) * 100)) : 0;

  return (
    <li className="rounded-lg border border-neutral-800 p-4 flex flex-col gap-2 fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{challenge.title}</p>
          {challenge.description && <p className="text-xs text-neutral-500 mt-0.5">{challenge.description}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(challenge.status)}`}>
          {t(`challenges.status_${challenge.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${challenge.earned ? "bg-green-500" : "bg-purple-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500 shrink-0">{challenge.progress}/{challenge.target_count}</span>
      </div>

      {challenge.earned && <p className="text-xs text-green-400">{t("challenges.earned_badge")}</p>}

      <div className="flex gap-2 mt-1">
        <button onClick={onOpenLeaderboard} className={btnSecondarySmall}>{t("challenges.leaderboard_button")}</button>
        {canDelete && (
          <button onClick={onDelete} className={btnDangerSmall}>{t("challenges.delete_button")}</button>
        )}
      </div>
    </li>
  );
}

function LeaderboardPanel({ challengeId, onClose }: { challengeId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const leaderboardQuery = useQuery({
    queryKey: ["challenge-leaderboard", challengeId],
    queryFn: () => getLeaderboard(challengeId),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t("challenges.leaderboard_heading")}</h3>
          <button onClick={onClose} className={btnSecondarySmall}>{t("common.cancel")}</button>
        </div>

        {leaderboardQuery.isLoading && <SkeletonRows count={3} />}
        {leaderboardQuery.isError && <p className="text-sm text-red-400">{t("challenges.leaderboard_error")}</p>}

        {leaderboardQuery.data && (
          <ol className="flex flex-col gap-2">
            {leaderboardQuery.data.entries.map((entry, idx) => (
              <li
                key={entry.user.id}
                className={`flex items-center gap-3 rounded-md px-2 py-2 ${entry.is_viewer ? "bg-purple-950/40 border border-purple-800" : ""}`}
              >
                <span className="text-xs text-neutral-500 w-4 shrink-0">{idx + 1}</span>
                <Avatar username={entry.user.username} avatarUrl={entry.user.avatar_url} size="sm" />
                <span className="flex-1 text-sm truncate">{entry.user.username}</span>
                {entry.earned && <span className="text-xs">🏆</span>}
                <span className="text-xs text-neutral-400 shrink-0">
                  {entry.progress}/{leaderboardQuery.data.challenge.target_count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function ChallengesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [leaderboardChallengeId, setLeaderboardChallengeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ChallengeKind>("movie_count");
  const [genreName, setGenreName] = useState("");
  const [targetCount, setTargetCount] = useState(5);
  const now = new Date();
  const inAMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(now));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(inAMonth));

  const challengesQuery = useQuery({
    queryKey: ["challenges"],
    queryFn: getChallenges,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createChallenge({
        title: title.trim(),
        description: description.trim() || null,
        kind,
        genre_name: kind === "genre_count" ? genreName.trim() : null,
        target_count: targetCount,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      }),
    onSuccess: () => {
      setShowForm(false);
      setTitle("");
      setDescription("");
      setGenreName("");
      setTargetCount(5);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail ?? i18n.t("challenges.create_error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (challengeId: string) => deleteChallenge(challengeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenges"] }),
    onError: () => {
      // só quem criou pode apagar — o backend responde 404 pros demais,
      // então avisamos em vez de deixar o clique parecer que não fez nada
      window.alert(t("challenges.delete_forbidden"));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === "genre_count" && !genreName.trim()) {
      setFormError(t("challenges.genre_required_error"));
      return;
    }
    createMutation.mutate();
  }

  const challenges = challengesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("challenges.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={`${btnPrimary} self-start`}>
            {t("challenges.new_button")}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("challenges.form_title_placeholder")}
              maxLength={100}
              className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("challenges.form_description_placeholder")}
              maxLength={500}
              className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />

            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400">{t("challenges.form_kind_label")}</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ChallengeKind)}
                className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{t(`challenges.kind_${k}`)}</option>
                ))}
              </select>
            </label>

            {kind === "genre_count" && (
              <input
                type="text"
                value={genreName}
                onChange={(e) => setGenreName(e.target.value)}
                placeholder={t("challenges.form_genre_placeholder")}
                maxLength={50}
                className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400">{t("challenges.form_target_label")}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">{t("challenges.form_starts_label")}</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">{t("challenges.form_ends_label")}</span>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
                />
              </label>
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending || !title.trim()} className={btnPrimarySmall}>
                {t("challenges.form_submit")}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={btnSecondarySmall}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}

        {challengesQuery.isLoading && <SkeletonRows count={3} />}
        {challengesQuery.isError && <p className="text-sm text-red-400">{t("challenges.error")}</p>}
        {challengesQuery.data && challenges.length === 0 && <EmptyState icon="🏆" message={t("challenges.empty")} />}

        <ul className="flex flex-col gap-3">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onOpenLeaderboard={() => setLeaderboardChallengeId(c.id)}
              onDelete={() => {
                if (window.confirm(t("challenges.delete_confirm"))) {
                  deleteMutation.mutate(c.id);
                }
              }}
              canDelete
            />
          ))}
        </ul>
      </main>

      {leaderboardChallengeId && (
        <LeaderboardPanel challengeId={leaderboardChallengeId} onClose={() => setLeaderboardChallengeId(null)} />
      )}
    </div>
  );
}
