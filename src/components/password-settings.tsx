"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";

export function PasswordSettings() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const newPassword = String(fields.get("newPassword") ?? "");
    const confirmPassword = String(fields.get("confirmPassword") ?? "");
    setError(""); setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden."); return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: fields.get("currentPassword"), newPassword, confirmPassword }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) throw new Error(result?.error ?? "No se pudo cambiar la contraseña. Intenta nuevamente.");
      form.reset(); setVisible(false);
      setSuccess("Contraseña actualizada. Usa la nueva la próxima vez que entres. Las demás sesiones se han cerrado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la contraseña.");
    } finally { setSaving(false); }
  }

  return <section className="panel mt-6 max-w-3xl overflow-hidden" aria-labelledby="password-settings-title">
    <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--forest-soft)] text-[var(--forest)]"><KeyRound size={20} aria-hidden="true" /></span>
      <div><h2 id="password-settings-title" className="font-bold">Cambiar contraseña</h2><p className="text-xs text-[var(--muted)]">Actualiza la contraseña de acceso a tu cuenta.</p></div>
    </div>
    <form onSubmit={submit} className="p-5">
      {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <fieldset disabled={saving} className="space-y-4">
        <label className="block"><span className="label">Contraseña actual</span><input className="field" name="currentPassword" type={visible ? "text" : "password"} autoComplete="current-password" required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Nueva contraseña</span><input className="field" name="newPassword" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="password-help" required /></label>
          <label><span className="label">Confirmar nueva contraseña</span><input className="field" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={72} required /></label>
        </div>
        <p id="password-help" className="text-xs text-[var(--muted)]">Usa al menos 12 caracteres. Puede ser una frase que recuerdes. Tendrás que volver a entrar en tus otros dispositivos.</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-secondary" onClick={() => setVisible(!visible)} aria-pressed={visible}>{visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}</button>
          <button className="btn-primary" type="submit">{saving ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <KeyRound size={17} aria-hidden="true" />}{saving ? "Guardando..." : "Cambiar contraseña"}</button>
        </div>
      </fieldset>
    </form>
  </section>;
}
