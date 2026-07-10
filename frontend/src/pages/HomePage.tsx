import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

type HealthResponse = {
  status: string;
};

function useBackendHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get<HealthResponse>("/health");
      return data;
    },
    retry: 1,
  });
}

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { data, isLoading, isError } = useBackendHealth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-neutral-950 text-neutral-100 px-4">
      <div className="flex gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-3 py-1 rounded-md text-sm border ${
              i18n.resolvedLanguage === lang.code
                ? "bg-purple-600 border-purple-500"
                : "border-neutral-700 hover:border-neutral-500"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("app.title")}</h1>
        <p className="text-neutral-400 mt-2">{t("app.subtitle")}</p>
      </div>

      {user && (
        <div className="text-center text-sm text-neutral-300">
          Logado como <span className="font-medium">{user.username}</span> ({user.email})
        </div>
      )}

      <div
        data-testid="backend-status"
        className={`rounded-lg px-4 py-3 text-sm border ${
          isError
            ? "border-red-500 text-red-400 bg-red-950/40"
            : isLoading
              ? "border-neutral-700 text-neutral-400"
              : "border-emerald-500 text-emerald-400 bg-emerald-950/40"
        }`}
      >
        {isLoading && t("backend.status.loading")}
        {isError && t("backend.status.error")}
        {data && t("backend.status.ok", { status: data.status })}
      </div>

      <button
        onClick={() => logout()}
        className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-4 py-2 text-sm"
      >
        Sair
      </button>
    </div>
  );
}
