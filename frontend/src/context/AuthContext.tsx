import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAccessToken } from "../lib/api";

export type User = {
  id: string;
  email: string;
  username: string;
  preferred_language: string;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ao carregar o app, tenta restaurar a sessão usando o cookie
    // httpOnly de refresh (o access token em si nunca é persistido).
    api
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.access_token);
        setUser(res.data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
  }

  async function signup(email: string, username: string, password: string) {
    const res = await api.post("/auth/signup", { email, username, password });
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
  }

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
