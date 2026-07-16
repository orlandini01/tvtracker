import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import "./i18n";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
