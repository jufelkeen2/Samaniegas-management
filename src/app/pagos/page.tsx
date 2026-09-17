"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, CircleDollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, LoadingBlock, Modal, Notice, PageHeader, StatusPill } from "@/components/ui";
import { fullDate, usd } from "@/lib/format";

type Payment = { id: string; clientId: string; amount: number; dueDate: string; paymentDate: string | null; status: "PENDING" | "PAID"; notes: string; clientBalance: number; client: { id: string; name: string; phone: string } };
type ClientOption = { id: string; name: string; active: boolean; servicePrice: number };
const today = new Date().toISOString().slice(0, 10);

export default function PaymentsPage() {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [status, setStatus] = useState("ALL");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editing, setEditing] = useState<Payment | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [paymentResponse, clientResponse] = await Promise.all([fetch(`/api/payments?month=${month}&status=${status}`), fetch("/api/clients")]); if (!paymentResponse.ok || !clientResponse.ok) throw new Error(); setPayments(await paymentResponse.json()); setClients(await clientResponse.json()); }
    catch { setError("No se pudieron cargar los pagos."); }
    finally { setLoading(false); }
  }, [month, status]);
  useEffect(() => {
    // Recarga el listado al cambiar cualquiera de los filtros.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget); const payload = Object.fromEntries(form.entries());
    try { const isNew = editing === "new"; const response = await fetch(isNew ? "/api/payments" : `/api/payments/${(editing as Payment).id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setEditing(null); setMessage(isNew ? "Pago registrado." : "Pago actualizado."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el pago."); }
    finally { setSaving(false); }
  }

  async function markPaid(payment: Payment) {
    setError("");
    try { const response = await fetch(`/api/payments/${payment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID", paymentDate: today }) }); if (!response.ok) throw new Error(); setMessage("Pago marcado como pagado."); await load(); }
    catch { setError("No se pudo actualizar el pago."); }
  }

  async function remove(payment: Payment) {
    if (!window.confirm(`¿Eliminar el registro de pago de ${payment.client.name}?`)) return;
    try { const response = await fetch(`/api/payments/${payment.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setMessage("Registro de pago eliminado."); await load(); } catch { setError("No se pudo eliminar el pago."); }
  }

  const firstClient = clients.find((client) => client.active);
  const initial = editing === "new" || !editing ? { clientId: firstClient?.id ?? "", amount: firstClient ? firstClient.servicePrice : "", dueDate: `${month}-15`, paymentDate: today, status: "PENDING", notes: "" } : editing;
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return <>
    <PageHeader title="Pagos" description="Un cobro mensual por cliente, correspondiente a sus dos visitas incluidas." action={<button className="btn-primary" onClick={() => { setEditing("new"); setError(""); }}><Plus size={17} />Registrar pago</button>} />
    {message && <Notice type="success">{message}</Notice>}{error && !editing && <Notice type="error">{error}</Notice>}
    <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_260px]"><div className="panel grid gap-3 p-4 sm:grid-cols-2"><label><span className="label">Mes</span><input className="field" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label><span className="label">Estado del pago</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="PENDING">Pendientes</option><option value="PAID">Pagados</option></select></label></div><div className="panel flex items-center gap-4 p-4"><span className="grid size-11 place-items-center rounded-md bg-sky-50 text-sky-700"><CircleDollarSign size={22} /></span><div><p className="text-xs text-[var(--muted)]">Total en el filtro</p><p className="text-xl font-bold">{usd.format(total)}</p></div></div></div>
    {loading ? <LoadingBlock /> : <div className="panel overflow-hidden">{payments.length ? <>
      <div className="hidden grid-cols-[1.2fr_.8fr_.85fr_.8fr_130px] gap-4 border-b border-[var(--line)] bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-[var(--muted)] md:grid"><span>Cliente</span><span>Monto mensual</span><span>Fecha</span><span>Estado</span><span className="text-right">Acciones</span></div>
      <div className="divide-y divide-[var(--line)]">{payments.map((payment) => <article key={payment.id} className="grid gap-3 p-4 md:grid-cols-[1.2fr_.8fr_.85fr_.8fr_130px] md:items-center md:p-5"><div><p className="font-semibold">{payment.client.name}</p><p className="text-xs text-[var(--muted)]">Saldo total: {usd.format(payment.clientBalance)}</p></div><p className="font-bold">{usd.format(payment.amount)}</p><div><p className="text-sm">{fullDate.format(new Date(payment.dueDate + "T00:00:00Z"))}</p><p className="text-xs text-[var(--muted)]">{payment.paymentDate ? `Pagado ${fullDate.format(new Date(payment.paymentDate + "T00:00:00Z"))}` : "Fecha límite"}</p></div><div><StatusPill kind={payment.status === "PAID" ? "green" : "amber"}>{payment.status === "PAID" ? "Pagado" : "Pendiente"}</StatusPill></div><div className="flex justify-end gap-1">{payment.status === "PENDING" && <button className="grid size-9 place-items-center rounded-md bg-[var(--forest)] text-white" onClick={() => void markPaid(payment)} aria-label={`Marcar pago de ${payment.client.name} como pagado`} title="Marcar pagado"><Check size={16} /></button>}<button className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" onClick={() => { setEditing(payment); setError(""); }} aria-label="Editar pago" title="Editar"><Pencil size={16} /></button><button className="grid size-9 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => void remove(payment)} aria-label="Eliminar pago" title="Eliminar"><Trash2 size={16} /></button></div></article>)}</div>
    </> : <EmptyState title="No hay pagos en este filtro" text="Registra un pago o cambia el mes y el estado." />}</div>}
    {editing && <Modal title={editing === "new" ? "Registrar pago" : "Editar pago"} onClose={() => setEditing(null)}><form onSubmit={save} className="p-5">{error && <Notice type="error">{error}</Notice>}<div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Cliente *</span><select className="field" name="clientId" defaultValue={initial.clientId} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label><span className="label">Monto mensual (USD) *</span><input className="field" name="amount" type="number" min="0.01" step="0.01" defaultValue={initial.amount} required /><span className="mt-1 block text-xs text-[var(--muted)]">Incluye las dos visitas del mes.</span></label><label><span className="label">Estado *</span><select className="field" name="status" defaultValue={initial.status}><option value="PENDING">Pendiente</option><option value="PAID">Pagado</option></select></label><label><span className="label">Fecha límite *</span><input className="field" name="dueDate" type="date" defaultValue={initial.dueDate} required /></label><label><span className="label">Fecha de pago</span><input className="field" name="paymentDate" type="date" defaultValue={initial.paymentDate ?? today} /></label><label className="sm:col-span-2"><span className="label">Notas</span><textarea className="field min-h-20" name="notes" defaultValue={initial.notes} /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</button></div></form></Modal>}
  </>;
}
