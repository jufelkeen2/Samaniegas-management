"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, LoadingBlock, Modal, Notice, PageHeader, StatusPill } from "@/components/ui";
import { fullDate, usd } from "@/lib/format";

type Visit = { id: string; clientId: string; scheduledDate: string; completed: boolean; actualDate: string | null; notes: string; client: { id: string; name: string; address: string; phone: string; servicePrice: number } };
type ClientOption = { id: string; name: string; active: boolean };
const today = new Date().toISOString().slice(0, 10);

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editing, setEditing] = useState<Visit | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [visitResponse, clientResponse] = await Promise.all([fetch(`/api/visits?month=${month}&status=${status}&clientId=${clientFilter === "ALL" ? "" : encodeURIComponent(clientFilter)}`), fetch("/api/clients")]); if (!visitResponse.ok || !clientResponse.ok) throw new Error(); setVisits(await visitResponse.json()); setClients(await clientResponse.json()); }
    catch { setError("No se pudo cargar el calendario."); }
    finally { setLoading(false); }
  }, [month, status, clientFilter]);
  useEffect(() => {
    // Recarga el listado al cambiar cualquiera de los filtros.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget); const completed = Boolean(form.get("completed"));
    const payload = { clientId: form.get("clientId"), scheduledDate: form.get("scheduledDate"), actualDate: form.get("actualDate"), notes: form.get("notes"), completed };
    try { const isNew = editing === "new"; const response = await fetch(isNew ? "/api/visits" : `/api/visits/${(editing as Visit).id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setEditing(null); setMessage(isNew ? "Visita añadida." : "Visita actualizada."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar la visita."); }
    finally { setSaving(false); }
  }

  async function toggle(visit: Visit) {
    setError("");
    try { const response = await fetch(`/api/visits/${visit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !visit.completed, actualDate: !visit.completed ? today : null }) }); if (!response.ok) throw new Error(); setMessage(!visit.completed ? "Servicio marcado como completado." : "Servicio devuelto a pendiente."); await load(); }
    catch { setError("No se pudo actualizar el servicio."); }
  }

  async function remove(visit: Visit) {
    if (!window.confirm(`¿Eliminar la visita de ${visit.client.name}?`)) return;
    try { const response = await fetch(`/api/visits/${visit.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setMessage("Visita eliminada."); await load(); } catch { setError("No se pudo eliminar la visita."); }
  }

  const initial = editing === "new" || !editing ? { clientId: clients.find((c) => c.active)?.id ?? "", scheduledDate: `${month}-07`, actualDate: today, completed: false, notes: "" } : editing;
  return <>
    <PageHeader title="Calendario de servicios" description="Dos visitas mensuales se programan por defecto para cada cliente activo." action={<button className="btn-primary" onClick={() => { setEditing("new"); setError(""); }}><Plus size={17} />Añadir visita</button>} />
    {message && <Notice type="success">{message}</Notice>}{error && !editing && <Notice type="error">{error}</Notice>}
    <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:w-fit lg:grid-cols-[190px_220px_260px]"><label><span className="label">Mes</span><input className="field" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label><span className="label">Estado del servicio</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="PENDING">Pendientes</option><option value="COMPLETED">Completados</option></select></label><label className="sm:col-span-2 lg:col-span-1"><span className="label">Cliente</span><select className="field" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="ALL">Todos los clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div>
    {loading ? <LoadingBlock /> : <div className="panel overflow-hidden">{visits.length ? <div className="divide-y divide-[var(--line)]">{visits.map((visit) => <article key={visit.id} className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:p-5">
      <div><p className="text-sm font-bold capitalize">{fullDate.format(new Date(visit.scheduledDate + "T00:00:00Z"))}</p><p className="mt-1 text-xs text-[var(--muted)]">{visit.completed && visit.actualDate ? `Real: ${fullDate.format(new Date(visit.actualDate + "T00:00:00Z"))}` : "Fecha programada"}</p></div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{visit.client.name}</p><StatusPill kind={visit.completed ? "green" : "amber"}>{visit.completed ? "Completado" : "Pendiente"}</StatusPill></div><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--muted)]"><MapPin size={13} />{visit.client.address}</p><p className="mt-1 text-xs font-semibold text-[var(--forest)]">Plan mensual: {usd.format(visit.client.servicePrice)} · incluye las 2 visitas</p></div>
      <div className="flex items-center justify-end gap-1"><button onClick={() => void toggle(visit)} className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${visit.completed ? "border border-[var(--line)] bg-white text-[var(--muted)]" : "bg-[var(--forest)] text-white"}`} title={visit.completed ? "Reabrir servicio" : "Marcar como completado"}><Check size={15} />{visit.completed ? "Reabrir" : "Completar"}</button><button className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" onClick={() => { setEditing(visit); setError(""); }} aria-label="Editar visita" title="Editar"><Pencil size={16} /></button><button className="grid size-9 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => void remove(visit)} aria-label="Eliminar visita" title="Eliminar"><Trash2 size={16} /></button></div>
    </article>)}</div> : <EmptyState title="No hay visitas en este filtro" text="Cambia el mes o el estado, o añade una visita manualmente." />}</div>}
    {editing && <Modal title={editing === "new" ? "Añadir visita" : "Editar visita"} onClose={() => setEditing(null)}><form onSubmit={save} className="p-5">{error && <Notice type="error">{error}</Notice>}<div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Cliente *</span><select className="field" name="clientId" defaultValue={initial.clientId} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.active ? "" : " (inactivo)"}</option>)}</select></label><label><span className="label">Fecha programada *</span><input className="field" name="scheduledDate" type="date" defaultValue={initial.scheduledDate} required /></label><label><span className="label">Fecha real</span><input className="field" name="actualDate" type="date" defaultValue={initial.actualDate ?? today} /></label><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="completed" defaultChecked={initial.completed} className="size-4 accent-[var(--forest)]" />Servicio completado</label><label className="sm:col-span-2"><span className="label">Notas de la visita</span><textarea className="field min-h-20" name="notes" defaultValue={initial.notes} /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar visita"}</button></div></form></Modal>}
  </>;
}
