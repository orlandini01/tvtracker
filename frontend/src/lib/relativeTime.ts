import i18n from "../i18n";

// Recipe padrão de "tempo relativo" (baseado no exemplo do MDN pra
// Intl.RelativeTimeFormat) — divide a diferença em segundos indo de unidade
// em unidade até achar a que cabe. Usa o idioma ativo do app, então já sai
// certo em pt/en/it sem precisar de lib extra (date-fns etc).
const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  let duration = (date.getTime() - Date.now()) / 1000;

  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), "years");
}
