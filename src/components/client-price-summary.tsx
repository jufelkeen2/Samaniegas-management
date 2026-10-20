"use client";

import { useRef, useState } from "react";
import { Download, Table2, X } from "lucide-react";
import { usd } from "@/lib/format";

type PriceClient = {
  id: string; name: string; phone: string; address: string;
  servicePrice: number; paymentDay: number; active: boolean;
};

const cents = (price: number) => Math.round(price * 100);

export function ClientPriceSummary({ clients, loading, unavailable }: {
  clients: PriceClient[]; loading: boolean; unavailable: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sort, setSort] = useState("name");
  const total = clients.reduce((sum, client) => sum + cents(client.servicePrice), 0) / 100;
  const ordered = [...clients].sort((a, b) => {
    const priceOrder = sort === "price-desc" ? cents(b.servicePrice) - cents(a.servicePrice)
      : sort === "price-asc" ? cents(a.servicePrice) - cents(b.servicePrice) : 0;
    return priceOrder || a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id);
  });

  function exportCsv() {
    // Quote every cell and neutralize spreadsheet formulas in client-supplied text.
    const cell = (value: string | number) => {
      const text = String(value);
      return `"${(/^[\s]*[=+\-@\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
    };
    const rows = [
      ["N.º", "Cliente", "Estado", "Teléfono", "Dirección", "Día de pago", "Precio mensual (USD)"],
      ...ordered.map((client, index) => [index + 1, client.name, client.active ? "Activo" : "Inactivo", client.phone, client.address, client.paymentDay, (cents(client.servicePrice) / 100).toFixed(2)]),
      ["", "TOTAL MENSUAL", "", "", "", "", total.toFixed(2)],
    ];
    const url = URL.createObjectURL(new Blob(["\uFEFF", rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "samaniegas-precios-clientes.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <section className="panel mb-5 flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Resumen de precios de clientes">
      <div>
        <p className="text-sm font-semibold text-[var(--muted)]">Total mensual de todos los clientes</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--forest)]" aria-live="polite">{loading ? "Calculando..." : unavailable ? "No disponible" : usd.format(total)}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Suma de precios mensuales · Incluye activos e inactivos</p>
      </div>
      <button type="button" className="btn-primary" disabled={loading || unavailable} onClick={() => dialog.current?.showModal()}><Table2 size={18} aria-hidden="true" />Ver tabla de clientes</button>
    </section>
    <dialog ref={dialog} aria-labelledby="client-prices-title" aria-describedby="client-prices-description" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-6xl overflow-hidden rounded-lg border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/40">
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div><h2 id="client-prices-title" className="text-lg font-bold">Tabla de precios de clientes</h2><p id="client-prices-description" className="mt-1 text-xs text-[var(--muted)]">{clients.length} clientes · Precios mensuales en USD · Incluye activos e inactivos</p></div>
          <button type="button" autoFocus className="grid size-10 shrink-0 place-items-center rounded-md hover:bg-gray-100" aria-label="Cerrar tabla" onClick={() => dialog.current?.close()}><X size={20} /></button>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-5 py-3">
          <label className="flex items-center gap-2 text-sm"><span className="shrink-0 font-medium">Ordenar por</span><select className="field" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Nombre (A–Z)</option><option value="price-desc">Precio: mayor a menor</option><option value="price-asc">Precio: menor a mayor</option></select></label>
          <button type="button" className="btn-secondary" onClick={exportCsv}><Download size={16} aria-hidden="true" />Exportar CSV para Excel</button>
        </div>
        <div className="min-h-0 overflow-auto" tabIndex={0} role="region" aria-label="Tabla desplazable de precios">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm [&_th]:border [&_th]:border-[var(--line)] [&_td]:border [&_td]:border-[var(--line)] [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-3">
            <caption className="sr-only">Precios mensuales de todos los clientes, con suma total al final.</caption>
            <thead className="sticky top-0 z-10 bg-[var(--forest)] text-white"><tr><th scope="col">N.º</th><th scope="col">Cliente</th><th scope="col">Estado</th><th scope="col">Teléfono</th><th scope="col">Dirección</th><th scope="col">Día de pago</th><th scope="col" className="text-right">Precio mensual</th></tr></thead>
            <tbody>{ordered.length ? ordered.map((client, index) => <tr key={client.id} className="odd:bg-white even:bg-emerald-50/40 hover:bg-emerald-50"><td className="text-center text-[var(--muted)]">{index + 1}</td><th scope="row" className="font-semibold">{client.name}</th><td>{client.active ? "Activo" : "Inactivo"}</td><td className="whitespace-nowrap">{client.phone}</td><td>{client.address}</td><td className="text-center">{client.paymentDay}</td><td className="whitespace-nowrap text-right font-medium tabular-nums">{usd.format(client.servicePrice)}</td></tr>) : <tr><td colSpan={7} className="text-center text-[var(--muted)]">No hay clientes. Los nuevos aparecerán aquí automáticamente.</td></tr>}</tbody>
            <tfoot className="sticky bottom-0 bg-[var(--forest-soft)] font-bold text-[var(--forest-dark)]"><tr><th scope="row" colSpan={6}>TOTAL MENSUAL · {clients.length} clientes</th><td className="whitespace-nowrap text-right tabular-nums">{usd.format(total)}</td></tr></tfoot>
          </table>
        </div>
        <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">Se actualiza al agregar, editar o eliminar clientes. En el celular, desliza la tabla hacia los lados para ver todas las columnas.</p>
      </div>
    </dialog>
  </>;
}
