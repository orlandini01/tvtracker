import { api } from "./api";

export type ShareStatus = {
  enabled: boolean;
  share_token: string | null;
};

export type ProfileStats = {
  movies_watched: number;
  shows_watched: number;
  episodes_watched: number;
  friends_count: number;
  achievements_earned: number;
  achievements_total: number;
};

export type Profile = {
  id: string;
  username: string;
  bio: string | null;
  created_at: string;
  is_self: boolean;
  stats: ProfileStats;
};

export async function getMyProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>("/profile/me");
  return data;
}

export async function getUserProfile(userId: string): Promise<Profile> {
  const { data } = await api.get<Profile>(`/profile/${userId}`);
  return data;
}

export async function updateBio(bio: string | null): Promise<Profile> {
  const { data } = await api.patch<Profile>("/profile/me/bio", { bio });
  return data;
}

export async function updateUsername(username: string): Promise<Profile> {
  const { data } = await api.patch<Profile>("/profile/me/username", { username });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/profile/me/password", { current_password: currentPassword, new_password: newPassword });
}

export async function getShareStatus(): Promise<ShareStatus> {
  const { data } = await api.get<ShareStatus>("/profile/share");
  return data;
}

export async function activateShare(): Promise<ShareStatus> {
  const { data } = await api.post<ShareStatus>("/profile/share");
  return data;
}

export async function rotateShare(): Promise<ShareStatus> {
  const { data } = await api.post<ShareStatus>("/profile/share/rotate");
  return data;
}

export async function deactivateShare(): Promise<ShareStatus> {
  const { data } = await api.delete<ShareStatus>("/profile/share");
  return data;
}
