import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MediaCard } from "../components/MediaCard";
import { NotificationBell } from "../components/NotificationBell";
import {
  DISCOVER_CATEGORIES,
  discoverByProviders,
  discoverMedia,
  getProviderCatalog,
  searchMedia,
  type MediaSummary,
  type MediaType,
} from "../lib/media";

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];

// value = mesma chave usada no backend (categoria de discover); a label
// exibida vem do i18n (home.categories.<value>).
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  popular_movies: "home.categories.popular_movies",
  popular_tv: "home.categories.popular_tv",
  now_playing: "home.categories.now_playing",
  upcoming: "home.categories.upcoming",
  on_the_air: "home.categories.on_the_air",
};

// Lista não muda a cada segundo — evita refetch/erro toda vez que o usuário
// troca de aba do navegador e reduz a chance de esbarrar em rate limit do TMDB.
const LIST_STALE_TIME = 5 * 60 * 1000;

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const [category, setCategory] = useState<string>(DISCOVER_CATEGORIES[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const isSearching = activeQuery.trim().length > 0;

  // Filtro por streaming: quando há provedores selecionados, a listagem
  // troca de "categoria" pra "descoberta filtrada por plataforma".
  const [showStreamingFilter, setShowStreamingFilter] = useState(false);
  const [providerMediaType, setProviderMediaType] = useState<MediaType>("movie");
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);
  const hasProviderFilter = selectedProviders.length > 0;

  const providerCatalogQuery = useQuery({
    queryKey: ["provider-catalog", providerMediaType],
    queryFn: () => getProviderCatalog(providerMediaType),
    staleTime: 60 * 60 * 1000,
  });

  function toggleProvider(id: number) {
    setSelectedProviders((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function clearProviderFilter() {
    setSelectedProviders([]);
  }

  const discoverQuery = useInfiniteQuery({
    queryKey: ["discover", category],
    queryFn: ({ pageParam }) => discoverMedia(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined),
    enabled: !isSearching && !hasProviderFilter,
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

  const providerDiscoverQuery = useInfiniteQuery({
    queryKey: ["discover-by-provider", providerMediaType, selectedProviders.slice().sort().join(",")],
    queryFn: ({ pageParam }) => discoverByProviders(providerMediaType, selectedProviders, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined),
    enabled: !isSearching && hasProviderFilter,
    staleTime: LIST_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  const active = isSearching ? searchQuery : hasProviderFilter ? providerDiscoverQuery : discoverQuery;

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
  }, [active.hasNextPage, active.isFetchingNextPage, active.fetchNextPage, category, activeQuery, providerMediaType, selectedProviders]);

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
            placeholder={t("home.search_placeholder")}
            className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <button type="submit" className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium">
            {t("home.search_button")}
          </button>
          {isSearching && (
            <button type="button" onClick={clearSearch} className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500">
              {t("home.clear_button")}
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
          <NotificationBell />
          <Link to="/wrapped" className="rounded-md border border-neutral-700 hover:border-purple-500 px-3 py-1.5 text-sm">
            {t("nav.wrapped")}
          </Link>
          <Link to="/feed" className="rounded-md border border-neutral-700 hover:border-purple-500 px-3 py-1.5 text-sm">
            {t("nav.feed")}
          </Link>
          <Link to="/amigos" className="rounded-md border border-neutral-700 hover:border-purple-500 px-3 py-1.5 text-sm">
            {t("nav.friends")}
          </Link>
          <Link to="/minha-lista" className="rounded-md border border-neutral-700 hover:border-purple-500 px-3 py-1.5 text-sm">
            {t("nav.my_list")}
          </Link>
          {user && <span className="text-sm text-neutral-400 hidden sm:inline">{user.username}</span>}
          <button onClick={() => logout()} className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1.5 text-sm">
            {t("nav.logout")}
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {!isSearching && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowStreamingFilter((v) => !v)}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${
                  hasProviderFilter ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {t("home.streaming_toggle")}{hasProviderFilter ? ` (${selectedProviders.length})` : ""}
              </button>
              {hasProviderFilter && (
                <button onClick={clearProviderFilter} className="text-xs text-neutral-500 hover:text-red-400 hover:underline">
                  {t("home.streaming_clear")}
                </button>
              )}
            </div>

            {showStreamingFilter && (
              <div className="rounded-lg border border-neutral-800 p-3 mb-3">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setProviderMediaType("movie")}
                    className={`px-3 py-1 rounded-md text-xs border ${
                      providerMediaType === "movie" ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {t("home.streaming_movies")}
                  </button>
                  <button
                    onClick={() => setProviderMediaType("tv")}
                    className={`px-3 py-1 rounded-md text-xs border ${
                      providerMediaType === "tv" ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {t("home.streaming_tv")}
                  </button>
                </div>

                {providerCatalogQuery.isLoading && <p className="text-xs text-neutral-500">{t("home.streaming_loading")}</p>}
                {providerCatalogQuery.isError && <p className="text-xs text-red-400">{t("home.streaming_error")}</p>}

                <div className="flex flex-wrap gap-2">
                  {providerCatalogQuery.data?.map((p) => (
                    <button
                      key={p.provider_id}
                      onClick={() => toggleProvider(p.provider_id)}
                      title={p.provider_name}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                        selectedProviders.includes(p.provider_id)
                          ? "bg-purple-600 border-purple-500"
                          : "border-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      {p.logo_url && <img src={p.logo_url} alt="" className="w-5 h-5 rounded" />}
                      {p.provider_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasProviderFilter && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DISCOVER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${
                      category === cat.value ? "bg-purple-600 border-purple-500" : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {t(CATEGORY_LABEL_KEYS[cat.value])}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isSearching && <p className="text-sm text-neutral-400 mb-4">{t("home.search_results_for", { query: activeQuery })}</p>}
        {!isSearching && hasProviderFilter && (
          <p className="text-sm text-neutral-400 mb-4">
            {t(providerMediaType === "movie" ? "home.provider_results_movie" : "home.provider_results_tv")}
          </p>
        )}

        {showInitialLoading && <p className="text-neutral-400 text-sm">{t("home.loading")}</p>}

        {showInitialError && (
          <p className="text-red-400 text-sm">
            {t("home.error")}
          </p>
        )}

        {!showInitialLoading && !showInitialError && results.length === 0 && (
          <p className="text-neutral-400 text-sm">{t("home.empty")}</p>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((item) => (
                <MediaCard key={`${item.media_type}-${item.tmdb_id}`} item={item} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
              {active.isFetchingNextPage && <span className="text-xs text-neutral-500">{t("home.loading_more")}</span>}
              {!active.hasNextPage && !active.isFetchingNextPage && (
                <span className="text-xs text-neutral-600">{t("home.end_of_results")}</span>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-neutral-600">
        {t("home.footer_tmdb")}
      </footer>
    </div>
  );
}
