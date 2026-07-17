import { api } from "./api";

export type Achievement = {
  id: string;
  earned: boolean;
  progress: number;
  target: number;
};

export async function getAchievements(): Promise<Achievement[]> {
  const { data } = await api.get<{ results: Achievement[] }>("/achievements");
  return data.results;
}
