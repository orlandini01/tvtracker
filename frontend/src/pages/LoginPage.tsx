import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import i18n from "../i18n";

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { status?: number; data?: unknown } };
  if (anyErr?.response?.status === 401) {
    return i18n.t("auth.login.invalid_credentials");
  }
  const detail = (anyErr?.response?.data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg as string;
  return i18n.t("auth.login.generic_error");
}

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
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
        <h2 className="text-xl font-medium text-center">{t("auth.login.heading")}</h2>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-500 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.login.email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.login.password")}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2 font-medium"
        >
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>

        <p className="text-sm text-neutral-400 text-center">
          {t("auth.login.no_account")}{" "}
          <Link to="/signup" className="text-purple-400 hover:underline">
            {t("auth.login.signup_link")}
          </Link>
        </p>
      </form>
    </div>
  );
}
