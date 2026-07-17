import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getAchievements } from "../lib/achievements";
import { ACHIEVEMENT_META } from "../lib/achievementsMeta";
import { SkeletonBlock } from "../components/Skeleton";
import { btnSecondary } from "../lib/buttonStyles";

export function AchievementsPage() {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievements,
  });

  const earnedCount = query.data?.filter((a) => a.earned).length ?? 0;
  const totalCount = query.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">{t("achievements.title")}</h1>
        <Link to="/" className={btnSecondary}>{t("common.back_discover")}</Link>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto">
        {query.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}
        {query.isError && <p className="text-sm text-red-400 text-center">{t("achievements.error")}</p>}

        {query.data && (
          <div className="fade-in">
            <p className="text-sm text-neutral-400 text-center mb-6">
              {t("achievements.summary", { earned: earnedCount, total: totalCount })}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {query.data.map((achievement) => {
                const meta = ACHIEVEMENT_META[achievement.id];
                if (!meta) return null;
                const pct = Math.round((achievement.progress / achievement.target) * 100);

                return (
                  <div
                    key={achievement.id}
                    className={`rounded-xl border p-4 flex gap-3 ${
                      achievement.earned ? "border-purple-700 bg-purple-950/20" : "border-neutral-800"
                    }`}
                  >
                    <div className={`text-3xl shrink-0 ${achievement.earned ? "" : "grayscale opacity-40"}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${achievement.earned ? "text-purple-300" : "text-neutral-200"}`}>
                        {t(meta.nameKey)}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">{t(meta.descriptionKey)}</p>

                      <div className="mt-2 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${achievement.earned ? "bg-purple-500" : "bg-neutral-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {achievement.progress}/{achievement.target}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
