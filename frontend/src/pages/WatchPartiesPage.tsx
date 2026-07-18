import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  cancelWatchParty,
  listWatchParties,
  respondToWatchParty,
  type WatchParty,
} from "../lib/watchParty";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { btnDangerSmall, btnPrimarySmall, btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(i18n.language, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function inviteStatusBadgeClass(status: string): string {
  if (status === "accepted") return "bg-green-900 text-green-300";
  if (status === "declined") return "bg-neutral-800 text-neutral-500";
  return "bg-amber-900 text-amber-300";
}

function PartyCard({ party }: { party: WatchParty }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["watch-parties"] });
  }

  const respondMutation = useMutation({
    mutationFn: (status: "accepted" | "declined") => respondToWatchParty(party.id, status),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelWatchParty(party.id),
    onSuccess: invalidate,
  });

  const myInviteStatus = party.is_host ? null : (party.my_status as "pending" | "accepted" | "declined" | null);

  return (
    <li className="rounded-lg border border-neutral-800 p-4 flex flex-col gap-3 fade-in">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/media/${party.media.media_type}/${party.media.tmdb_id}`} className="flex items-center gap-3 min-w-0">
          {party.media.poster_url ? (
            <img src={party.media.poster_url} alt={party.media.title} className="w-12 h-16 object-cover rounded-sm flex-shrink-0" />
          ) : (
            <div className="w-12 h-16 rounded-sm bg-neutral-800 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{party.media.title}</p>
            <p className="text-xs text-purple-400">{formatWhen(party.scheduled_at)}</p>
          </div>
        </Link>
        {party.is_host ? (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-900 text-purple-300">
            {t("watchParty.host_badge")}
          </span>
        ) : (
          myInviteStatus && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${inviteStatusBadgeClass(myInviteStatus)}`}>
              {t(`watchParty.invite_status_${myInviteStatus}`)}
            </span>
          )
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Avatar username={party.host.username} avatarUrl={party.host.avatar_url} size="sm" />
        <span>{t("watchParty.hosted_by", { username: party.host.username })}</span>
      </div>

      {party.note && <p className="text-sm text-neutral-300 italic">"{party.note}"</p>}

      {party.invites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {party.invites.map((invite) => (
            <span
              key={invite.user.id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${inviteStatusBadgeClass(invite.status)}`}
            >
              {invite.user.username}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {!party.is_host && myInviteStatus === "pending" && (
          <>
            <button onClick={() => respondMutation.mutate("accepted")} disabled={respondMutation.isPending} className={btnPrimarySmall}>
              {t("watchParty.accept_button")}
            </button>
            <button onClick={() => respondMutation.mutate("declined")} disabled={respondMutation.isPending} className={btnSecondarySmall}>
              {t("watchParty.decline_button")}
            </button>
          </>
        )}
        {!party.is_host && myInviteStatus === "accepted" && (
          <button onClick={() => respondMutation.mutate("declined")} disabled={respondMutation.isPending} className={btnSecondarySmall}>
            {t("watchParty.decline_button")}
          </button>
        )}
        {party.is_host && (
          <button
            onClick={() => {
              if (window.confirm(t("watchParty.cancel_confirm"))) cancelMutation.mutate();
            }}
            disabled={cancelMutation.isPending}
            className={btnDangerSmall}
          >
            {t("watchParty.cancel_button")}
          </button>
        )}
      </div>
    </li>
  );
}

export function WatchPartiesPage() {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ["watch-parties"],
    queryFn: listWatchParties,
  });

  const parties = query.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("watchParty.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        <p className="text-sm text-neutral-500">{t("watchParty.subtitle")}</p>

        {query.isLoading && <SkeletonRows count={3} />}
        {query.isError && <p className="text-sm text-red-400">{t("watchParty.error")}</p>}
        {query.data && parties.length === 0 && <EmptyState icon="🎉" message={t("watchParty.empty")} />}

        <ul className="flex flex-col gap-3">
          {parties.map((party) => (
            <PartyCard key={party.id} party={party} />
          ))}
        </ul>
      </main>
    </div>
  );
}
