import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import i18n from "../i18n";

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { status?: number; data?: unknown } };
  if (anyErr?.response?.status === 409) {
    return i18n.t("auth.signup.email_taken");
  }
  const detail = (anyErr?.response?.data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg as string;
  return i18n.t("auth.signup.generic_error");
}

function localPasswordIssue(password: string): string | null {
  if (password.length < 8) return i18n.t("auth.signup.password_too_short");
  if (!/[A-Za-z]/.test(password)) return i18n.t("auth.signup.password_needs_letter");
  if (!/\d/.test(password)) return i18n.t("auth.signup.password_needs_number");
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
        <h2 className="text-xl font-medium text-center">{t("auth.signup.heading")}</h2>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-500 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.signup.email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("auth.signup.username")}
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
          {t("auth.signup.password")}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
          />
          <span className="text-xs text-neutral-500">
            {t("auth.signup.password_hint")}
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2 font-medium"
        >
          {isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </button>

        <p className="text-sm text-neutral-400 text-center">
          {t("auth.signup.has_account")}{" "}
          <Link to="/login" className="text-purple-400 hover:underline">
            {t("auth.signup.login_link")}
          </Link>
        </p>
      </form>
    </div>
  );
}
