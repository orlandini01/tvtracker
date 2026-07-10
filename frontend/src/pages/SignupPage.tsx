import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { status?: number; data?: unknown } };
  if (anyErr?.response?.status === 409) {
    return "Email ou username já cadastrado";
  }
  const detail = (anyErr?.response?.data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg as string;
  return "Não foi possível criar a conta. Tenta de novo.";
}

function localPasswordIssue(password: string): string | null {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres";
  if (!/[A-Za-z]/.test(password)) return "A senha precisa ter pelo menos uma letra";
  if (!/\d/.test(password)) return "A senha precisa ter pelo menos um número";
  return null;
}

export function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordIssue = localPasswordIssue(password);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-neutral-950 text-neutral-100 px-4">
      <h1 className="text-3xl font-semibold">{t("app.title")}</h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-lg p-6"
      >
        <h2 className="text-xl font-medium text-center">Criar conta</h2>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-500 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
          <span className="text-xs text-neutral-500">
            Mínimo 8 caracteres, com pelo menos uma letra e um número.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2 font-medium"
        >
          {isSubmitting ? "Criando..." : "Criar conta"}
        </button>

        <p className="text-sm text-neutral-400 text-center">
          Já tem conta?{" "}
          <Link to="/login" className="text-purple-400 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
