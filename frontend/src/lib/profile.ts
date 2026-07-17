import { api } from "./api";

export type ShareStatus = {
  enabled: boolean;
  share_token: string | null;
};

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
