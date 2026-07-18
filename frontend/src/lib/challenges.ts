import { api } from "./api";

export type ChallengeKind = "movie_count" | "episode_count" | "genre_count";
export type ChallengeStatus = "upcoming" | "active" | "ended";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  kind: ChallengeKind;
  genre_name: string | null;
  target_count: number;
  starts_at: string;
  ends_at: string;
  status: ChallengeStatus;
  progress: number;
  earned: boolean;
};

export type ChallengeCreate = {
  title: string;
  description?: string | null;
  kind: ChallengeKind;
  genre_name?: string | null;
  target_count: number;
  starts_at: string;
  ends_at: string;
};

export type LeaderboardUser = { id: string; username: string; avatar_url: string | null };
export type LeaderboardEntry = { user: LeaderboardUser; progress: number; earned: boolean; is_viewer: boolean };
export type LeaderboardResponse = { challenge: Challenge; entries: LeaderboardEntry[] };

export async function getChallenges(): Promise<Challenge[]> {
  const { data } = await api.get<{ results: Challenge[] }>("/challenges");
  return data.results;
}

export async function createChallenge(payload: ChallengeCreate): Promise<Challenge> {
  const { data } = await api.post<Challenge>("/challenges", payload);
  return data;
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  await api.delete(`/challenges/${challengeId}`);
}

export async function getLeaderboard(challengeId: string): Promise<LeaderboardResponse> {
  const { data } = await api.get<LeaderboardResponse>(`/challenges/${challengeId}/leaderboard`);
  return data;
}
