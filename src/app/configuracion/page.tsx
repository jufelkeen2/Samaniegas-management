"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, CalendarDays, Save } from "lucide-react";
import { LoadingBlock, Notice, PageHeader } from "@/components/ui";

type Settings = { businessName: string; ownerName: string; phone: string; email: string; address: string; defaultVisitsPerMonth: number };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/settings").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setSettings).catch(() => setError("No se pudo cargar la configuración.")); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setSettings(result); setMessage("Configuración guardada correctamente."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar la configuración."); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader title="Configuración" description="Información básica y valores predeterminados del negocio." />
    {message && <Notice type="success">{message}</Notice>}{error && <Notice type="error">{error}</Notice>}
    {!settings && !error ? <LoadingBlock /> : settings && <form onSubmit={save} className="panel max-w-3xl overflow-hidden"><div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4"><span className="grid size-10 place-items-center rounded-md bg-[var(--forest-soft)] text-[var(--forest)]"><Building2 size={20} /></span><div><h2 className="font-bold">Datos del negocio</h2><p className="text-xs text-[var(--muted)]">Esta información identifica tu operación.</p></div></div><div className="grid gap-5 p-5 sm:grid-cols-2"><label><span className="label">Nombre del negocio *</span><input className="field" name="businessName" defaultValue={settings.businessName} required /></label><label><span className="label">Propietario o responsable</span><input className="field" name="ownerName" defaultValue={settings.ownerName} /></label><label><span className="label">Teléfono</span><input className="field" name="phone" type="tel" defaultValue={settings.phone} /></label><label><span className="label">Correo electrónico</span><input className="field" name="email" type="email" defaultValue={settings.email} /></label><label className="sm:col-span-2"><span className="label">Dirección</span><input className="field" name="address" defaultValue={settings.address} /></label><div className="flex items-center gap-3 text-sm sm:col-span-2"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700"><CalendarDays size={18} /></span><div><p className="font-semibold">2 visitas fijas por cliente al mes</p><p className="text-xs text-[var(--muted)]">Los días se definen al crear o editar cada cliente.</p></div></div></div><div className="flex justify-end border-t border-[var(--line)] bg-gray-50 px-5 py-4"><button className="btn-primary" disabled={saving}><Save size={17} />{saving ? "Guardando..." : "Guardar cambios"}</button></div></form>}
    <div className="mt-5 max-w-3xl rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><p className="font-semibold">Datos de demostración</p><p className="mt-1 text-sky-800">Los clientes y movimientos precargados son ejemplos ficticios. Puedes editarlos o eliminarlos desde sus respectivas secciones.</p></div>
  </>;
}
