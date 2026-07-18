import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../context/AuthContext";
import {
  changePassword,
  getMyProfile,
  removeAvatar,
  updateBio,
  updateEmailNotifications,
  updateUsername,
  uploadAvatar,
} from "../lib/profile";
import { getAchievements } from "../lib/achievements";
import { ACHIEVEMENT_META } from "../lib/achievementsMeta";
import { disablePush, enablePush, getPushSubscriptionStatus, isPushSupported, PushError } from "../lib/push";
import { Avatar } from "../components/Avatar";
import { SkeletonBlock } from "../components/Skeleton";
import { btnPrimary, btnPrimarySmall, btnSecondary, btnSecondarySmall } from "../lib/buttonStyles";

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

export function ProfilePage() {
  const { t } = useTranslation();
  const { updateUsername: syncCachedUsername, updateAvatar: syncCachedAvatar } = useAuth();
  const queryClient = useQueryClient();

  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
  const achievementsQuery = useQuery({ queryKey: ["achievements"], queryFn: getAchievements });
  // Diferente do email (preferência guardada no servidor), o "ligado?" do
  // push é lido direto do navegador — a existência de uma inscrição do
  // Push API É o opt-in, não tem coluna de preferência pra isso.
  const pushStatusQuery = useQuery({
    queryKey: ["push-subscription-status"],
    queryFn: getPushSubscriptionStatus,
    enabled: isPushSupported(),
  });

  const bioMutation = useMutation({
    mutationFn: (bio: string | null) => updateBio(bio),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
      setEditingBio(false);
    },
  });

  const usernameMutation = useMutation({
    mutationFn: (username: string) => updateUsername(username),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
      syncCachedUsername(data.username);
      setEditingUsername(false);
      setUsernameError(null);
    },
    onError: (err: any) => {
      setUsernameError(err?.response?.data?.detail ?? t("profile.username_error"));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err: any) => {
      setPasswordSuccess(false);
      setPasswordError(err?.response?.data?.detail ?? t("profile.password_error"));
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
      syncCachedAvatar(data.avatar_url);
      setAvatarError(null);
    },
    onError: (err: any) => {
      setAvatarError(err?.response?.data?.detail ?? t("profile.avatar_error"));
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
      syncCachedAvatar(data.avatar_url);
      setAvatarError(null);
    },
  });

  const emailNotificationsMutation = useMutation({
    mutationFn: (enabled: boolean) => updateEmailNotifications(enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile"], data);
    },
  });

  const pushMutation = useMutation({
    mutationFn: (enable: boolean) => (enable ? enablePush() : disablePush()),
    onSuccess: () => {
      setPushError(null);
      queryClient.invalidateQueries({ queryKey: ["push-subscription-status"] });
    },
    onError: (err: any) => {
      const reason = err instanceof PushError ? err.message : "generic";
      setPushError(t(`profile.push_error_${reason}`, t("profile.push_error_generic")));
    },
  });

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    avatarMutation.mutate(file);
  }

  function startEditingBio() {
    setBioInput(profileQuery.data?.bio ?? "");
    setEditingBio(true);
  }

  function handleBioSubmit(e: FormEvent) {
    e.preventDefault();
    bioMutation.mutate(bioInput.trim() || null);
  }

  function startEditingUsername() {
    setUsernameInput(profileQuery.data?.username ?? "");
    setUsernameError(null);
    setEditingUsername(true);
  }

  function handleUsernameSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    usernameMutation.mutate(trimmed);
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    passwordMutation.mutate();
  }

  const profile = profileQuery.data;
  const achievements = achievementsQuery.data ?? [];
  const previewAchievements = achievements.slice(0, 6);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("profile.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto flex flex-col gap-6">
        {profileQuery.isLoading && (
          <div className="flex flex-col items-center gap-3">
            <SkeletonBlock className="w-20 h-20 rounded-full" />
            <SkeletonBlock className="h-5 w-40" />
          </div>
        )}
        {profileQuery.isError && <p className="text-sm text-red-400 text-center">{t("profile.error")}</p>}

        {profile && (
          <div className="fade-in flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative group">
                <Avatar username={profile.username} avatarUrl={profile.avatar_url} size="lg" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  title={t("profile.avatar_change")}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm hover:bg-neutral-700 disabled:opacity-50"
                >
                  📷
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {avatarMutation.isPending && <p className="text-xs text-neutral-500">{t("profile.avatar_uploading")}</p>}
              {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
              {profile.avatar_url && !avatarMutation.isPending && (
                <button
                  type="button"
                  onClick={() => removeAvatarMutation.mutate()}
                  disabled={removeAvatarMutation.isPending}
                  className="text-xs text-neutral-500 hover:text-red-400"
                >
                  {t("profile.avatar_remove")}
                </button>
              )}

              {editingUsername ? (
                <form onSubmit={handleUsernameSubmit} className="flex flex-col items-center gap-2 w-full max-w-xs">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    maxLength={50}
                    autoFocus
                    className="w-full text-center rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-lg outline-none focus:border-purple-500"
                  />
                  {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={usernameMutation.isPending || !usernameInput.trim()} className={btnPrimarySmall}>
                      {t("profile.username_save")}
                    </button>
                    <button type="button" onClick={() => setEditingUsername(false)} className={btnSecondarySmall}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{profile.username}</h2>
                  <button onClick={startEditingUsername} title={t("profile.username_edit")} className="text-neutral-500 hover:text-purple-400 text-sm">
                    ✏️
                  </button>
                </div>
              )}

              <p className="text-xs text-neutral-500">{t("profile.member_since", { date: formatMemberSince(profile.created_at) })}</p>

              {editingBio ? (
                <form onSubmit={handleBioSubmit} className="flex flex-col items-center gap-2 w-full max-w-sm">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={280}
                    rows={2}
                    autoFocus
                    placeholder={t("profile.bio_placeholder")}
                    className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={bioMutation.isPending} className={btnPrimarySmall}>
                      {t("profile.bio_save")}
                    </button>
                    <button type="button" onClick={() => setEditingBio(false)} className={btnSecondarySmall}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={startEditingBio} className="text-sm text-neutral-400 hover:text-neutral-200 max-w-sm">
                  {profile.bio || <span className="italic text-neutral-600">{t("profile.bio_empty")}</span>}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={profile.stats.movies_watched} label={t("profile.stats_movies")} />
              <StatCard value={profile.stats.shows_watched} label={t("profile.stats_shows")} />
              <StatCard value={profile.stats.episodes_watched} label={t("profile.stats_episodes")} />
              <StatCard value={profile.stats.friends_count} label={t("profile.stats_friends")} />
            </div>

            <div className="rounded-xl border border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-neutral-300">
                  {t("profile.achievements_heading", { earned: profile.stats.achievements_earned, total: profile.stats.achievements_total })}
                </h3>
                <Link to="/conquistas" className="text-xs text-purple-400 hover:underline">
                  {t("profile.achievements_see_all")}
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {previewAchievements.map((a) => {
                  const meta = ACHIEVEMENT_META[a.id];
                  if (!meta) return null;
                  return (
                    <div
                      key={a.id}
                      title={t(meta.nameKey)}
                      className={`text-2xl ${a.earned ? "" : "grayscale opacity-30"}`}
                    >
                      {meta.icon}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 p-4 flex flex-col gap-3">
              <h3 className="text-sm font-medium text-neutral-300">{t("profile.account_heading")}</h3>

              <Link to="/wrapped" className={btnSecondary + " self-start"}>
                {t("profile.wrapped_link")}
              </Link>

              <label className="flex items-center justify-between gap-3 max-w-xs cursor-pointer">
                <span className="text-sm text-neutral-300">{t("profile.email_notifications_label")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.email_notifications_enabled ?? false}
                  disabled={emailNotificationsMutation.isPending}
                  onClick={() => emailNotificationsMutation.mutate(!(profile.email_notifications_enabled ?? false))}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                    profile.email_notifications_enabled ? "bg-purple-600" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      profile.email_notifications_enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-neutral-500 -mt-2">{t("profile.email_notifications_hint")}</p>

              {isPushSupported() && (
                <>
                  <label className="flex items-center justify-between gap-3 max-w-xs cursor-pointer">
                    <span className="text-sm text-neutral-300">{t("profile.push_notifications_label")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushStatusQuery.data ?? false}
                      disabled={pushMutation.isPending || pushStatusQuery.isLoading}
                      onClick={() => pushMutation.mutate(!(pushStatusQuery.data ?? false))}
                      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                        pushStatusQuery.data ? "bg-purple-600" : "bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          pushStatusQuery.data ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </label>
                  <p className="text-xs text-neutral-500 -mt-2">{t("profile.push_notifications_hint")}</p>
                  {pushError && <p className="text-xs text-red-400 -mt-2">{pushError}</p>}
                </>
              )}

              {!showPasswordForm && (
                <button onClick={() => setShowPasswordForm(true)} className={btnSecondarySmall + " self-start"}>
                  {t("profile.change_password_button")}
                </button>
              )}

              {showPasswordForm && (
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2 max-w-xs">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("profile.current_password_label")}
                    className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm outline-none focus:border-purple-500"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("profile.new_password_label")}
                    className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm outline-none focus:border-purple-500"
                  />
                  {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                  {passwordSuccess && <p className="text-xs text-green-400">{t("profile.password_success")}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={passwordMutation.isPending || !currentPassword || !newPassword}
                      className={btnPrimary}
                    >
                      {t("profile.password_save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordError(null);
                        setCurrentPassword("");
                        setNewPassword("");
                      }}
                      className={btnSecondarySmall}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
