import { api } from "./api";
import type { MediaType } from "./media";

export type Comment = {
  id: string;
  user: { id: string; username: string };
  body: string;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
};

export async function getComments(mediaType: MediaType, tmdbId: number): Promise<Comment[]> {
  const { data } = await api.get<{ results: Comment[] }>(`/comments/${mediaType}/${tmdbId}`);
  return data.results;
}

export async function postComment(mediaType: MediaType, tmdbId: number, body: string): Promise<Comment> {
  const { data } = await api.post<Comment>(`/comments/${mediaType}/${tmdbId}`, { body });
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}
