import { api } from "./api";
import type { MediaType } from "./media";

export type InviteStatus = "pending" | "accepted" | "declined";

export type PartyUser = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export type PartyMedia = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
};

export type PartyInvite = {
  user: PartyUser;
  status: InviteStatus;
  responded_at: string | null;
};

export type WatchParty = {
  id: string;
  host: PartyUser;
  media: PartyMedia;
  scheduled_at: string;
  note: string | null;
  created_at: string;
  is_host: boolean;
  my_status: "host" | InviteStatus | null;
  invites: PartyInvite[];
};

export type WatchPartyCreate = {
  media_type: MediaType;
  tmdb_id: number;
  scheduled_at: string;
  note?: string | null;
  invitee_usernames: string[];
};

export async function listWatchParties(): Promise<WatchParty[]> {
  const { data } = await api.get<{ results: WatchParty[] }>("/watch-parties");
  return data.results;
}

export async function getWatchParty(partyId: string): Promise<WatchParty> {
  const { data } = await api.get<WatchParty>(`/watch-parties/${partyId}`);
  return data;
}

export async function createWatchParty(payload: WatchPartyCreate): Promise<WatchParty> {
  const { data } = await api.post<WatchParty>("/watch-parties", payload);
  return data;
}

export async function respondToWatchParty(partyId: string, status: "accepted" | "declined"): Promise<WatchParty> {
  const { data } = await api.post<WatchParty>(`/watch-parties/${partyId}/respond`, { status });
  return data;
}

export async function cancelWatchParty(partyId: string): Promise<void> {
  await api.delete(`/watch-parties/${partyId}`);
}
