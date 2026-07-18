import { api } from "./api";
import type { MediaType } from "./media";

export type CalendarItem = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_url: string | null;
  date: string;
  kind: "movie_release" | "episode";
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
};

export async function getCalendar(): Promise<CalendarItem[]> {
  const { data } = await api.get<{ results: CalendarItem[] }>("/calendar");
  return data.results;
}

// O endpoint exige o header Authorization (token só em memória), então não
// dá pra simplesmente apontar um <a href> pra ele — baixamos como blob e
// disparamos o download programaticamente.
export async function downloadIcsExport(): Promise<void> {
  const response = await api.get("/calendar/export.ics", { responseType: "blob" });
  const blob = new Blob([response.data], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trackertv-calendario.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Link "Adicionar ao Google Agenda" por item — construído inteiramente no
// frontend (Google aceita esse formato de URL diretamente), sem precisar
// de endpoint próprio no backend.
export function googleCalendarLink(item: CalendarItem): string {
  const start = new Date(`${item.date}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const text =
    item.kind === "movie_release"
      ? `Estreia: ${item.title}`
      : `${item.title}${item.season_number != null ? ` T${item.season_number}E${item.episode_number}` : ""}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
