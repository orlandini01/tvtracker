import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { MediaCard } from "../components/MediaCard";
import { DISCOVER_CATEGORIES, discoverMedia, searchMedia, type MediaSummary } from "../lib/media";

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];

// Lista não muda a cada segundo — evita refetch/erro toda vez que o usuário
// troca de aba do navegador e reduz a chance de esbarrar em rate limit do TMDB.
const LIST_STALE_TIME = 5 * 60 * 1000;

export function HomePage() {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();

  const [category, setCategory] = useState<string>(DISCOVER_CATEGORIES[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const isSearching = activeQuery.trim().length > 0;

  const discoverQuery = useInfiniteQuery({
    queryKey: ["discover", category],
    queryFn: ({ pageParam }) => discoverMedia(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined),
    enabled: !isSearching,
    staleTime: LIST_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  const searchQuery = useInfiniteQuery({
    queryKey: ["search", activeQuery],
    queryFn: ({ pageParam }) => searchMedia(activeQuery, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined),
    enabled: isSearching,
    staleTime: LIST_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  const active = isSearching ? searchQuery : discoverQuery;

  // Achata as páginas acumuladas num array só, removendo duplicatas (defensivo
  // caso o TMDB repita algum item entre páginas).
  const results = useMemo<MediaSummary[]>(() => {
    const pages = active.data?.pages ?? [];
    const seen = new Set<string>();
    const items: MediaSummary[] = [];
    for (const page of pages) {
      for (const item of page.results) {
        const key = `${item.media_type}-${item.tmdb_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
    }
    return items;
  }, [active.data]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && active.hasNextPage && !active.isFetchingNextPage) {
          active.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.hasNextPage, active.isFetchingNextPage, active.fetchNextPage, category, activeQuery]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setActiveQuery("");
  }

  // Só mostra "carregando"/"erro" quando ainda não há nenhum resultado na
  // tela — se já tem itens (mesmo de uma página anterior), a falha de uma
  // tentativa de refetch em segundo plano não deve sumir com o que já
  // funcionou nem exibir um aviso alarmante por cima da lista boa.
  const showInitialLoading = active.isLoading && results.length === 0;
  const showInitialError = active.isError && results.length === 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">TrackerTV</h1>

        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar filmes ou séries..."
            className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <button type="submit" className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium">
            Buscar
          </button>
          {isSearching && (
            <button type="button" onClick={clearSearch} className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500">
              Limpar
            </button>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-2 py-1 rounded-md text-xs border ${
                  i18n.resolvedLanguage === lang.code ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {user && <span className="text-sm text-neutral-400 hidden sm:inline">{user.username}</span>}
          <button onClick={() => logout()} className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1.5 text-sm">
            Sair
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {!isSearching && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {DISCOVER_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${
                  category === cat.value ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {isSearching && <p className="text-sm text-neutral-400 mb-4">Resultados para "{activeQuery}"</p>}

        {showInitialLoading && <p className="text-neutral-400 text-sm">Carregando...</p>}

        {showInitialError && (
          <p className="text-red-400 text-sm">
            Não foi possível carregar. Tenta de novo em alguns segundos (pode ser instabilidade momentânea do TMDB).
          </p>
        )}

        {!showInitialLoading && !showInitialError && results.length === 0 && (
          <p className="text-neutral-400 text-sm">Nada encontrado.</p>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((item) => (
                <MediaCard key={`${item.media_type}-${item.tmdb_id}`} item={item} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
              {active.isFetchingNextPage && <span className="text-xs text-neutral-500">Carregando mais...</span>}
              {!active.hasNextPage && !active.isFetchingNextPage && (
                <span className="text-xs text-neutral-600">Fim dos resultados.</span>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-neutral-600">
        Dados fornecidos por TMDB. Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
      </footer>
    </div>
  );
}