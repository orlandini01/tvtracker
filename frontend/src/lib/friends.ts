import { api } from "./api";

export type RelationshipStatus = "none" | "friends" | "pending_outgoing" | "pending_incoming";

export type UserSearchResult = {
  id: string;
  username: string;
  relationship_status: RelationshipStatus;
};

export type FriendUser = {
  id: string;
  username: string;
};

export type FriendRequest = {
  id: string;
  requester: FriendUser;
  addressee: FriendUser;
  status: string;
  created_at: string;
};

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const { data } = await api.get<{ results: UserSearchResult[] }>("/friends/search", { params: { q: query } });
  return data.results;
}

export async function sendFriendRequest(username: string): Promise<FriendRequest> {
  const { data } = await api.post<FriendRequest>("/friends/requests", { username });
  return data;
}

export async function listFriendRequests(direction: "incoming" | "outgoing"): Promise<FriendRequest[]> {
  const { data } = await api.get<{ results: FriendRequest[] }>("/friends/requests", { params: { direction } });
  return data.results;
}

export async function acceptFriendRequest(friendshipId: string): Promise<FriendRequest> {
  const { data } = await api.post<FriendRequest>(`/friends/requests/${friendshipId}/accept`);
  return data;
}

export async function declineOrCancelRequest(friendshipId: string): Promise<void> {
  await api.delete(`/friends/requests/${friendshipId}`);
}

export async function listFriends(): Promise<FriendUser[]> {
  const { data } = await api.get<{ results: FriendUser[] }>("/friends");
  return data.results;
}

export async function removeFriend(friendId: string): Promise<void> {
  await api.delete(`/friends/${friendId}`);
}
