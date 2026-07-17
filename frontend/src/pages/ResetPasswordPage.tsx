import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { resetPassword } from "../lib/passwordReset";

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: unknown } };
  const detail = (anyErr?.response?.data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && (detail as any)[0]?.msg) return (detail as any)[0].msg as string;
  return i18n.t("auth.resetPassword.generic_error");
}

function localPasswordIssue(password: string): string | null {
  if (password.length < 8) return i18n.t("auth.signup.password_too_short");
  if (!/[A-Za-z]/.test(password)) return i18n.t("auth.signup.password_needs_letter");
  if (!/\d/.test(password)) return i18n.t("auth.signup.password_needs_number");
  return null;
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.passwords_dont_match"));
      return;
    }
    const passwordIssue = localPasswordIssue(password);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token as string, password);
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100 px-4 text-center">
        <p className="text-red-400">{t("auth.resetPassword.missing_token")}</p>
        <Link to="/esqueci-senha" className="text-purple-400 hover:underline text-sm">
          {t("auth.resetPassword.request_new_link")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-neutral-950 text-neutral-100 px-4">
      <h1 className="text-3xl font-semibold">{t("app.title")}</h1>

      <div className="w-full max-w-sm flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-medium text-center">{t("auth.resetPassword.heading")}</h2>

        {success ? (
          <p className="text-sm text-green-400 bg-green-950/30 border border-green-700 rounded-md px-3 py-2 text-center">
            {t("auth.resetPassword.success_message")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-500 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <label className="flex flex-col gap-1 text-sm">
              {t("auth.resetPassword.new_password")}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t("auth.resetPassword.confirm_password")}
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-purple-500"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2 font-medium"
            >
              {isSubmitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
