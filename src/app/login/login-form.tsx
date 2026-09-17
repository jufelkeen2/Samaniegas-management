"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { Notice } from "@/components/ui";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo iniciar sesión.");
      window.location.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--canvas)] p-4 sm:p-6"><section className="w-full max-w-md overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_18px_50px_rgba(27,36,32,.10)]"><div className="border-b border-[var(--line)] px-6 py-7 text-center sm:px-8"><Image src="/logo.png" alt="Logo de Samaniegas Management" width={76} height={76} priority className="mx-auto size-[76px] rounded-md object-contain" /><h1 className="mt-4 text-2xl font-bold">Samaniegas Management</h1><p className="mt-1 text-sm text-[var(--muted)]">Acceso a la gestión del negocio</p></div><form onSubmit={submit} className="p-6 sm:p-8">{error && <Notice type="error">{error}</Notice>}<div className="space-y-4"><div><label className="label" htmlFor="login-username">Usuario</label><span className="relative block"><UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input id="login-username" className="field field-icon-left" name="username" autoComplete="username" required autoFocus placeholder="Ingresa tu usuario" /></span></div><div><label className="label" htmlFor="login-password">Contraseña</label><span className="relative block"><LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input id="login-password" className="field field-icon-both" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Ingresa tu contraseña" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></div></div><button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? <><LoaderCircle size={17} className="animate-spin" />Iniciando sesión...</> : <><LogIn size={17} />Iniciar sesión</>}</button></form></section></main>;
}
