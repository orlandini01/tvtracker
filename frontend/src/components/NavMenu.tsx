import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Menu "hambúrguer" com todos os links secundários da Home. Antes cada um
// virava um botão solto no header — com 11 links isso quebrava feio no
// celular (linha de botões cortada/enrolada). Agora só ficam sempre
// visíveis o sino de notificação e o avatar; o resto mora aqui dentro.
//
// No mobile isso é um painel `fixed` de verdade (com fundo escurecido por
// trás) em vez de um dropdown `absolute` ancorado no botão — um `absolute`
// não é robusto o bastante em telas estreitas (contexto de posicionamento
// de algum ancestral, viewport pequeno etc. podem fazer ele esticar ou
// aparecer no lugar errado). No desktop (`sm:` pra cima) ele volta a ser
// um dropdown pequeno ancorado no botão, como um menu normal.
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
        className={`flex flex-col items-center justify-center gap-[3px] w-9 h-9 rounded-md border transition-colors shrink-0 ${
          open ? "border-purple-500 bg-neutral-800" : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
        <span className="block w-4 h-0.5 rounded bg-neutral-300" />
      </button>

      {open && (
        <>
          {/* fundo escurecido — só existe pra fechar no toque fora do
              menu no mobile; no desktop o clique-fora via ref já cobre
              isso, mas ter os dois nunca atrapalha */}
          <div
            className="fixed inset-0 bg-black/60 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-64 sm:max-w-none max-w-none z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl py-2 fade-in"
          >
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-purple-400 transition-colors"
              >
                <span className="text-base w-5 text-center shrink-0">{link.icon}</span>
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
