import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { requestPasswordReset } from "../lib/passwordReset";

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: unknown } };
  const detail = (anyErr?.response?.data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  return i18n.t("auth.forgotPassword.generic_error");
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      // Sempre mostra a mesma mensagem de sucesso, exista ou não o email
      // (o backend já responde igual nos dois casos) -- não dá pra
      // diferenciar aqui na UI também, ou a proteção contra enumeração
      // de emails no backend não serviria de nada.
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-neutral-950 text-neutral-100 px-4">
      <h1 className="text-3xl font-semibold">{t("app.title")}</h1>

      <div className="w-full max-w-sm flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-medium text-center">{t("auth.forgotPassword.heading")}</h2>

        {sent ? (
          <p className="text-sm text-green-400 bg-green-950/30 border border-green-700 rounded-md px-3 py-2 text-center">
            {t("auth.forgotPassword.sent_message")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-neutral-400">{t("auth.forgotPassword.description")}</p>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2 font-medium"
            >
              {isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
            </button>
          </form>
        )}

        <p className="text-sm text-neutral-400 text-center">
          <Link to="/login" className="text-purple-400 hover:underline">
            {t("auth.forgotPassword.back_to_login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
