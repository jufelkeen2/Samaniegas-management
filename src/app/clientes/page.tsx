"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState, LoadingBlock, Modal, Notice, PageHeader, StatusPill } from "@/components/ui";
import { usd } from "@/lib/format";

type Client = { id: string; name: string; phone: string; address: string; notes: string; servicePrice: number; paymentDay: number; visitDay1: number; visitDay2: number; active: boolean; pendingBalance: number; _count: { visits: number } };
const blank = { name: "", phone: "", address: "", notes: "", servicePrice: "", paymentDay: "15", visitDay1: "7", visitDay2: "21", active: true };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search = query) => {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/clients?query=${encodeURIComponent(search)}`); if (!response.ok) throw new Error(); setClients(await response.json()); }
    catch { setError("No se pudieron cargar los clientes."); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => {
    // La primera carga no aplica ningún término de búsqueda.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.active = form.get("active") ? "true" : "";
    if (Number(payload.visitDay1) === Number(payload.visitDay2)) {
      setError("Los dos días de visita deben ser distintos."); setSaving(false); return;
    }
    const isNew = editing === "new";
    try {
      const response = await fetch(isNew ? "/api/clients" : `/api/clients/${(editing as Client).id}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, active: Boolean(payload.active) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setEditing(null); setMessage(isNew ? "Cliente creado correctamente." : "Cliente actualizado correctamente."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el cliente."); }
    finally { setSaving(false); }
  }

  async function remove(client: Client) {
    if (!window.confirm(`¿Eliminar a ${client.name}? También se eliminarán sus visitas y pagos.`)) return;
    setError("");
    try { const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setMessage("Cliente eliminado."); await load(); }
    catch { setError("No se pudo eliminar el cliente."); }
  }

  const initial = editing === "new" || !editing ? blank : { ...editing, servicePrice: String(editing.servicePrice), paymentDay: String(editing.paymentDay) };
  return <>
    <PageHeader title="Clientes" description={`${clients.length} registros visibles`} action={<button className="btn-primary" onClick={() => { setEditing("new"); setError(""); }}><Plus size={17} />Nuevo cliente</button>} />
    {message && <Notice type="success">{message}</Notice>}{error && !editing && <Notice type="error">{error}</Notice>}
    <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="panel mb-5 flex gap-2 p-3"><div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input className="field field-icon-left" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, teléfono o dirección" aria-label="Buscar clientes" /></div><button className="btn-secondary" type="submit">Buscar</button></form>
    {loading ? <LoadingBlock /> : <div className="panel overflow-hidden">{clients.length ? <>
      <div className="hidden grid-cols-[1.1fr_1.25fr_1fr_.7fr_100px] gap-4 border-b border-[var(--line)] bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-[var(--muted)] md:grid"><span>Cliente</span><span>Contacto</span><span>Plan mensual</span><span>Saldo</span><span className="text-right">Acciones</span></div>
      <div className="divide-y divide-[var(--line)]">{clients.map((client) => <article key={client.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1.1fr_1.25fr_1fr_.7fr_100px] md:items-center md:px-5">
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--forest-soft)] font-bold text-[var(--forest)]">{client.name.charAt(0)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{client.name}</p><StatusPill kind={client.active ? "green" : "gray"}>{client.active ? "Activo" : "Inactivo"}</StatusPill></div></div></div>
        <div className="space-y-1 text-xs text-[var(--muted)]"><p className="flex items-center gap-2"><Phone size={14} />{client.phone}</p><p className="flex items-center gap-2"><MapPin size={14} /><span className="truncate">{client.address}</span></p></div>
        <div><p className="text-sm font-semibold">{usd.format(client.servicePrice)} <span className="font-normal text-[var(--muted)]">/ mes</span></p><p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--forest)]"><CalendarDays size={14} />Incluye visitas los días {client.visitDay1} y {client.visitDay2}</p><p className="mt-1 text-xs text-[var(--muted)]">Paga el día {client.paymentDay}</p></div>
        <div><p className={`text-sm font-bold ${client.pendingBalance > 0 ? "text-[var(--amber)]" : "text-emerald-700"}`}>{usd.format(client.pendingBalance)}</p><p className="text-xs text-[var(--muted)]">pendiente</p></div>
        <div className="flex justify-end gap-1"><button className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" onClick={() => { setEditing(client); setError(""); }} aria-label={`Editar ${client.name}`} title="Editar"><Pencil size={16} /></button><button className="grid size-9 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => void remove(client)} aria-label={`Eliminar ${client.name}`} title="Eliminar"><Trash2 size={16} /></button></div>
      </article>)}</div></> : <EmptyState title="No hay clientes" text={query ? "Prueba con otro término de búsqueda." : "Agrega el primer cliente para comenzar."} />}</div>}
    {editing && <Modal title={editing === "new" ? "Nuevo cliente" : "Editar cliente"} onClose={() => setEditing(null)}><form onSubmit={submit} className="p-5">{error && <Notice type="error">{error}</Notice>}<div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Nombre completo *</span><input className="field" name="name" defaultValue={initial.name} required /></label><label><span className="label">Teléfono *</span><input className="field" name="phone" type="tel" defaultValue={initial.phone} required /></label><label className="sm:col-span-2"><span className="label">Dirección *</span><input className="field" name="address" defaultValue={initial.address} required /></label><label><span className="label">Precio mensual (incluye las 2 visitas) (USD) *</span><input className="field" name="servicePrice" type="number" min="0.01" step="0.01" defaultValue={initial.servicePrice} required /></label><label><span className="label">Día de pago habitual *</span><input className="field" name="paymentDay" type="number" min="1" max="31" defaultValue={initial.paymentDay} required /></label><fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">Días fijos de servicio</legend><p className="mb-3 text-xs text-[var(--muted)]">Si el mes es más corto, la visita se ajusta automáticamente a sus últimos días.</p><div className="grid grid-cols-2 gap-3"><label><span className="label">Día de visita 1 *</span><input className="field" name="visitDay1" type="number" min="1" max="31" step="1" defaultValue={initial.visitDay1} required /></label><label><span className="label">Día de visita 2 *</span><input className="field" name="visitDay2" type="number" min="1" max="31" step="1" defaultValue={initial.visitDay2} required /></label></div></fieldset><label className="sm:col-span-2"><span className="label">Notas</span><textarea className="field min-h-24 resize-y" name="notes" defaultValue={initial.notes} placeholder="Acceso, preferencias, detalles del jardín..." /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={initial.active} className="size-4 accent-[var(--forest)]" />Cliente activo</label></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar cliente"}</button></div></form></Modal>}
  </>;
}
