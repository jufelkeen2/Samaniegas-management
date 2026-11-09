"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, MapPin, Phone, Plus, X } from "lucide-react";
import { EmptyState, LoadingBlock, Notice, StatusPill } from "@/components/ui";
import { fullDate, usd } from "@/lib/format";

export type DetailClient = {
  id: string; name: string; phone: string; address: string; notes: string;
  servicePrice: number; paymentDay: number; visitDay1: number; visitDay2: number;
  active: boolean; pendingBalance: number; _count: { visits: number };
};
type Payment = { id: string; amount: number; dueDate: string; paymentDate: string | null; status: "PENDING" | "PAID"; notes: string };
type Visit = { id: string; scheduledDate: string; actualDate: string | null; completed: boolean; notes: string };
const dateLabel = (date: string) => fullDate.format(new Date(`${date}T00:00:00Z`));
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ClientDetail({ client, appleMaps, onClose, onPaymentsChange }: {
  client: DetailClient; appleMaps: boolean; onClose: () => void; onPaymentsChange: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Payment | "new" | null>(null);
  const [status, setStatus] = useState("ALL");
  const [month, setMonth] = useState("");
  const [visitMonth, setVisitMonth] = useState(localToday().slice(0, 7));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState("");
  const [visitRetry, setVisitRetry] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/payments?clientId=${encodeURIComponent(client.id)}&history=all`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("No se pudo cargar el historial. Intenta nuevamente.");
      setPayments(await response.json());
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Error al cargar los pagos.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [client.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    if (tab !== "services") return;
    const controller = new AbortController();
    setVisitsLoading(true); setVisitsError("");
    fetch(`/api/visits?clientId=${encodeURIComponent(client.id)}&month=${visitMonth}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); setVisits(await response.json()); })
      .catch(() => { if (!controller.signal.aborted) setVisitsError("No se pudieron cargar las visitas."); })
      .finally(() => { if (!controller.signal.aborted) setVisitsLoading(false); });
    return () => controller.abort();
  }, [client.id, tab, visitMonth, visitRetry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !editing) return;
    busy.current = true; setSaving(true); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(editing === "new" ? "/api/payments" : `/api/payments/${editing.id}`, {
        method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, clientId: client.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el pago.");
      setEditing(null);
      setMessage(values.status === "PAID" ? "Pago confirmado. El saldo se ha actualizado." : "Cobro pendiente guardado.");
      await load(); onPaymentsChange();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el pago."); }
    finally { busy.current = false; setSaving(false); }
  }

  const paid = payments.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter(p => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
  const filtered = payments.filter(p => (!month || p.dueDate.startsWith(month)) && (status === "ALL" || p.status === status));
  const today = localToday();
  const defaultMonth = month || today.slice(0, 7);
  const lastDay = new Date(Number(defaultMonth.slice(0, 4)), Number(defaultMonth.slice(5, 7)), 0).getDate();
  const initial = editing && editing !== "new" ? editing : {
    amount: client.servicePrice, dueDate: `${defaultMonth}-${String(Math.min(client.paymentDay, lastDay)).padStart(2, "0")}`,
    paymentDate: today, status: "PAID", notes: "",
  };
  const mapUrl = appleMaps ? `https://maps.apple.com/?q=${encodeURIComponent(client.address)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`;

  return <dialog ref={dialog} aria-labelledby="client-detail-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} className="fixed inset-0 m-auto h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto border-0 bg-[var(--canvas)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/50 sm:h-auto sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-2xl">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-4">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--forest-soft)] text-xl font-bold text-[var(--forest)]">{client.name.charAt(0)}</span><div className="min-w-0"><p className="text-xs text-[var(--muted)]">Ficha del cliente</p><h2 id="client-detail-title" className="break-words text-xl font-bold">{client.name}</h2><StatusPill kind={client.active ? "green" : "gray"}>{client.active ? "Activo" : "Inactivo"}</StatusPill></div></div>
      <button type="button" className="btn-secondary shrink-0" aria-label="Cerrar ficha" disabled={saving} onClick={onClose}><X size={20} /></button>
    </header>
    <div className="p-4 sm:p-6">
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[
        ["Plan mensual", usd.format(client.servicePrice), "Incluye dos visitas"],
        ["Pagado", loading || error ? "—" : usd.format(paid), "Historial completo"],
        ["Saldo pendiente", loading || error ? "—" : usd.format(pending), "Todos los cobros registrados"],
      ].map(([label, value, hint]) => <div key={label} className="panel p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-bold text-[var(--forest)]">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{hint}</p></div>)}</div>
      <div className="mb-5 flex gap-2" aria-label="Secciones del cliente">{[["payments", "Pagos"], ["services", "Servicios"], ["information", "Información"]].map(([value, label]) => <button key={value} type="button" disabled={saving} aria-pressed={tab === value} className={`${tab === value ? "btn-primary" : "btn-secondary"} flex-1 justify-center`} onClick={() => { setTab(value); setEditing(null); }}>{label}</button>)}</div>
      {tab === "information" && <section className="panel space-y-5 p-5"><h3 className="font-bold">Contacto y preferencias</h3><a className="flex items-center gap-2 text-[var(--forest)] underline" href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} />{client.phone}</a><a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-[var(--forest)] underline"><MapPin size={17} className="shrink-0" />{client.address}</a><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-[var(--muted)]">Día habitual de pago</dt><dd className="font-semibold">Día {client.paymentDay}</dd></div><div><dt className="text-xs text-[var(--muted)]">Visitas mensuales</dt><dd className="font-semibold">Días {client.visitDay1} y {client.visitDay2}</dd></div></dl><div><p className="text-xs text-[var(--muted)]">Notas del cliente</p><p className="mt-1 whitespace-pre-wrap text-sm">{client.notes || "Sin notas registradas."}</p></div></section>}
      {tab === "services" && <section className="panel p-5"><label><span className="label">Mes de servicios</span><input type="month" className="field mb-4" value={visitMonth} required onChange={event => { if (event.target.value) setVisitMonth(event.target.value); }} /></label>{visitsLoading ? <LoadingBlock /> : visitsError ? <Notice type="error">{visitsError} <button className="underline" onClick={() => setVisitRetry(value => value + 1)}>Reintentar</button></Notice> : visits.length ? <div className="divide-y divide-[var(--line)]">{visits.map(visit => <article key={visit.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{dateLabel(visit.scheduledDate)}</p><StatusPill kind={visit.completed ? "green" : "amber"}>{visit.completed ? "Completado" : "Pendiente"}</StatusPill></div>{visit.actualDate && <p className="mt-1 text-xs text-[var(--muted)]">Realizado: {dateLabel(visit.actualDate)}</p>}{visit.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{visit.notes}</p>}</article>)}</div> : <EmptyState title="Sin visitas" text="No hay servicios registrados en este mes." />}</section>}
      {tab === "payments" && <section>
        {message && <div role="status"><Notice type="success">{message}</Notice></div>}
        {error && <div role="alert"><Notice type="error">{error} {!editing && <button className="underline" onClick={() => void load()}>Reintentar</button>}</Notice></div>}
        {editing ? <form key={editing === "new" ? "new" : editing.id} onSubmit={save} className="panel p-5">
          <h3 className="mb-1 text-lg font-bold">{editing === "new" ? "Registrar pago o cobro" : "Revisar y confirmar pago"}</h3><p className="mb-5 text-sm text-[var(--muted)]">{client.name} · Revisa el monto y la fecha antes de guardar.</p>
          <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Monto mensual (USD) *</span><input name="amount" type="number" min="0.01" max="99999999.99" step="0.01" required defaultValue={initial.amount} className="field" /><span className="text-xs text-[var(--muted)]">Incluye las dos visitas del mes.</span></label>
            <label><span className="label">Estado *</span><select name="status" defaultValue={initial.status} className="field"><option value="PAID">Pagado</option><option value="PENDING">Pendiente</option></select></label>
            <label><span className="label">Fecha límite *</span><input name="dueDate" type="date" defaultValue={initial.dueDate} required className="field" /></label>
            <label><span className="label">Fecha de pago *</span><input name="paymentDate" type="date" defaultValue={initial.paymentDate ?? today} required className="field" /></label>
            <label className="sm:col-span-2"><span className="label">Notas y referencia</span><textarea name="notes" defaultValue={initial.notes} className="field min-h-24" placeholder="Ej.: transferencia, número de referencia o aclaración del pago" /></label>
          </fieldset><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Confirmar y guardar"}</button></div>
        </form> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Historial de pagos</h3><p className="text-xs text-[var(--muted)]">Confirma un cobro existente para evitar registrarlo dos veces.</p></div><button className="btn-primary" disabled={loading || Boolean(error)} onClick={() => { setEditing("new"); setMessage(""); setError(""); }}><Plus size={16} />Registrar pago</button></div>
          <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2"><label><span className="label">Mes de vencimiento (vacío: todos)</span><input type="month" value={month} onChange={event => setMonth(event.target.value)} className="field" /></label><label><span className="label">Estado del pago</span><select className="field" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="PENDING">Pendientes</option><option value="PAID">Pagados</option></select></label></div>
          {loading ? <LoadingBlock /> : !error && <div className="panel divide-y divide-[var(--line)]">{filtered.length ? filtered.map(payment => <article key={payment.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-bold">{usd.format(payment.amount)}</p><p className="text-xs text-[var(--muted)]">Vence: {dateLabel(payment.dueDate)}</p>{payment.paymentDate && <p className="mt-1 text-xs text-[var(--muted)]">Pagado: {dateLabel(payment.paymentDate)}</p>}</div><StatusPill kind={payment.status === "PAID" ? "green" : "amber"}>{payment.status === "PAID" ? "Pagado" : payment.dueDate < today ? "Vencido" : "Pendiente"}</StatusPill><button className="btn-secondary" onClick={() => { setEditing({ ...payment, status: "PAID", paymentDate: payment.paymentDate ?? today }); setError(""); setMessage(""); }}>{payment.status === "PENDING" && <Check size={16} />}{payment.status === "PENDING" ? "Confirmar pago" : "Editar pago"}</button></div>{payment.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">{payment.notes}</p>}</article>) : <EmptyState title="Sin pagos en este filtro" text="Registra un cobro o ajusta los filtros para ver otros períodos." />}</div>}
        </>}
      </section>}
    </div>
  </dialog>;
}
