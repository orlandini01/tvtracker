import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import "./i18n";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sem isso, todo useQuery é considerado "stale" desde o instante em
      // que chega e refaz o fetch sempre que o componente remonta — na
      // prática, voltar pra um título que você acabou de ver reconsulta
      // tudo de novo (detalhe, provedores, listas...) mesmo sem nada ter
      // mudado. 60s dá uma folga real pra navegação for e volta sem
      // servir dado velho por muito tempo.
      staleTime: 60 * 1000,
    },
  },
});

// Registro incondicional do service worker — antes ele só era registrado
// dentro de enablePush() (opt-in de notificação push). Pra o app ser
// instalável como PWA, o navegador precisa ver um SW ativo mesmo pra
// quem nunca ligou push; enablePush() continua reaproveitando o mesmo
// registro (navigator.serviceWorker.register é idempotente).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Instalação de PWA é um extra, não algo crítico — uma falha aqui
      // (ex.: ambiente sem HTTPS em produção) não deve quebrar o app.
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
