import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { getUserProfile } from "../lib/profile";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { SkeletonBlock } from "../components/Skeleton";
import { btnSecondary } from "../lib/buttonStyles";

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 py-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

// Perfil de amigo -- somente-leitura, sem nenhum controle de edição de
// conta. O backend já garante que só volta 200 se os dois forem amigos
// (ou 403/404 caso contrário), então aqui é só exibir o que veio.
export function FriendProfilePage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();

  const profileQuery = useQuery({
    queryKey: ["friend-profile", userId],
    queryFn: () => getUserProfile(userId as string),
    enabled: Boolean(userId),
    retry: false,
  });

  const profile = profileQuery.data;

  if (profileQuery.isError) {
    const status = (profileQuery.error as any)?.response?.status;
    const message = status === 404 ? t("friendProfile.not_found") : t("friendProfile.not_friends");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100 px-6">
        <EmptyState icon="🔒" message={message} />
        <Link to="/amigos" className={btnSecondary}>{t("friendProfile.back")}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{profile ? t("friendProfile.title", { username: profile.username }) : t("friendProfile.loading")}</h1>
        <Link to="/amigos" className={btnSecondary}>{t("friendProfile.back")}</Link>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto flex flex-col gap-6">
        {profileQuery.isLoading && (
          <div className="flex flex-col items-center gap-3">
            <SkeletonBlock className="w-20 h-20 rounded-full" />
            <SkeletonBlock className="h-5 w-40" />
          </div>
        )}

        {profile && (
          <div className="fade-in flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar username={profile.username} size="lg" />
              <h2 className="text-xl font-semibold">{profile.username}</h2>
              <p className="text-xs text-neutral-500">{t("profile.member_since", { date: formatMemberSince(profile.created_at) })}</p>
              <p className="text-sm text-neutral-400 max-w-sm">
                {profile.bio || <span className="italic text-neutral-600">{t("friendProfile.no_bio")}</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={profile.stats.movies_watched} label={t("profile.stats_movies")} />
              <StatCard value={profile.stats.shows_watched} label={t("profile.stats_shows")} />
              <StatCard value={profile.stats.episodes_watched} label={t("profile.stats_episodes")} />
              <StatCard value={profile.stats.friends_count} label={t("profile.stats_friends")} />
            </div>

            <div className="rounded-xl border border-neutral-800 p-4 text-center">
              <p className="text-sm text-neutral-400">
                {t("profile.achievements_heading", { earned: profile.stats.achievements_earned, total: profile.stats.achievements_total })}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
