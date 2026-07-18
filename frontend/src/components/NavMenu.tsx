import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Menu "hambúrguer" com todos os links secundários da Home. Antes cada um
// virava um botão solto no header — com 11 links isso quebrava feio no
// celular (linha de botões cortada/enrolada). Agora só ficam sempre
// visíveis o sino de notificação e o avatar; o resto mora aqui dentro.
type NavLink = { to: string; labelKey: string; icon: string };

const LINKS: NavLink[] = [
  { to: "/feed", labelKey: "nav.feed", icon: "📰" },
  { to: "/amigos", labelKey: "nav.friends", icon: "👥" },
  { to: "/minha-lista", labelKey: "nav.my_list", icon: "🎬" },
  { to: "/listas", labelKey: "nav.custom_lists", icon: "📋" },
  { to: "/diario", labelKey: "nav.diary", icon: "📔" },
  { to: "/estatisticas", labelKey: "nav.stats", icon: "📊" },
  { to: "/roleta", labelKey: "nav.roulette", icon: "🎲" },
  { to: "/desafios", labelKey: "nav.challenges", icon: "🏆" },
  { to: "/conquistas", labelKey: "nav.achievements", icon: "🏅" },
  { to: "/calendario", labelKey: "nav.calendar", icon: "📅" },
  { to: "/wrapped", labelKey: "nav.wrapped", icon: "🎁" },
];

export function NavMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.menu")}
        aria-expanded={open}
        className={`flex flex-col items-center justify-center gap-[3px] w-9 h-9 rounded-md border transition-colors ${
          open ? "border-purple-500 bg-neutral-800" : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 max-h-[75vh] overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl z-50 py-2 fade-in">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-purple-400 transition-colors"
            >
              <span className="text-base w-5 text-center shrink-0">{link.icon}</span>
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
