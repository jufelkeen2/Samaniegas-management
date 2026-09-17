"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ChevronRight, CircleDollarSign, Clock3, Leaf, Users } from "lucide-react";
import { EmptyState, LoadingBlock, Notice, PageHeader, StatusPill } from "@/components/ui";
import { longDate, usd } from "@/lib/format";

type DashboardData = {
  month: string;
  metrics: { activeClients: number; pendingServices: number; completedServices: number; paid: number; pending: number };
  upcoming: { id: string; scheduledDate: string; client: { name: string; address: string } }[];
  pendingPayments: { id: string; amount: number; dueDate: string; client: { name: string } }[];
};

export default function Home() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError(""); setData(null);
    try { const response = await fetch(`/api/dashboard?month=${month}`); if (!response.ok) throw new Error(); setData(await response.json()); }
    catch { setError("No se pudo cargar el resumen. Verifica la conexión con la base de datos."); }
  }, [month]);
  useEffect(() => {
    // La carga se inicia al montar y cada vez que cambia el mes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const metricCards = data ? [
    { label: "Clientes activos", value: data.metrics.activeClients, detail: "en la cartera", icon: Users, color: "text-sky-700 bg-sky-50" },
    { label: "Servicios pendientes", value: data.metrics.pendingServices, detail: `${data.metrics.completedServices} completados`, icon: Clock3, color: "text-amber-700 bg-amber-50" },
    { label: "Cobrado", value: usd.format(data.metrics.paid), detail: "en cobros mensuales", icon: CircleDollarSign, color: "text-emerald-700 bg-emerald-50" },
    { label: "Pendiente de cobro", value: usd.format(data.metrics.pending), detail: "en cobros mensuales", icon: CalendarCheck, color: "text-rose-700 bg-rose-50" },
  ] : [];

  return <>
    <PageHeader title="Resumen del negocio" description="Una vista clara de servicios y cobros del mes." action={<label className="block w-full sm:w-44"><span className="label">Mes del resumen</span><input className="field" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>} />
    {error && <Notice type="error">{error} <button className="font-semibold underline" onClick={load}>Reintentar</button></Notice>}
    {!data && !error ? <LoadingBlock /> : data && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, detail, icon: Icon, color }) => <div key={label} className="panel p-5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-[var(--muted)]">{label}</p><span className={`grid size-9 place-items-center rounded-md ${color}`}><Icon size={18} /></span></div><p className="mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>)}
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><h2 className="font-bold">Próximos servicios</h2><p className="text-xs text-[var(--muted)]">Visitas pendientes más cercanas</p></div><Link href="/calendario" className="flex items-center text-sm font-semibold text-[var(--forest)]">Ver todos <ChevronRight size={16} /></Link></div>
          {data.upcoming.length ? <div className="divide-y divide-[var(--line)]">{data.upcoming.map((visit) => <div key={visit.id} className="flex items-center gap-4 px-5 py-4"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--forest-soft)] text-[var(--forest)]"><Leaf size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{visit.client.name}</p><p className="truncate text-xs text-[var(--muted)]">{visit.client.address}</p></div><div className="text-right"><p className="text-sm font-semibold capitalize">{longDate.format(new Date(visit.scheduledDate + "T00:00:00Z"))}</p><StatusPill kind="amber">Pendiente</StatusPill></div></div>)}</div> : <EmptyState title="Sin servicios próximos" text="No hay visitas pendientes para el resto de este mes." />}
        </div>
        <div className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><h2 className="font-bold">Pagos pendientes</h2><p className="text-xs text-[var(--muted)]">Cobros que requieren atención</p></div><Link href="/pagos" className="flex items-center text-sm font-semibold text-[var(--forest)]">Ver todos <ChevronRight size={16} /></Link></div>
          {data.pendingPayments.length ? <div className="divide-y divide-[var(--line)]">{data.pendingPayments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{payment.client.name}</p><p className="text-xs text-[var(--muted)]">Vence {longDate.format(new Date(payment.dueDate + "T00:00:00Z"))}</p></div><p className="shrink-0 font-bold text-[var(--amber)]">{usd.format(payment.amount)}</p></div>)}</div> : <EmptyState title="Todo al día" text="No hay pagos pendientes en este mes." />}
        </div>
      </section>
    </>}
  </>;
}
