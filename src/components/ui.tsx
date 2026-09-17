"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="page-title">{title}</h1><p className="mt-1 text-sm text-[var(--muted)]">{description}</p></div>{action}</div>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl sm:max-w-xl sm:rounded-lg"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" aria-label="Cerrar"><X size={19} /></button></div>{children}</div></div>;
}

export function Notice({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  return <div className={`mb-4 flex items-start gap-2 rounded-md border p-3 text-sm ${type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{children}</span></div>;
}

export function LoadingBlock() {
  return <div className="panel grid min-h-52 place-items-center text-sm text-[var(--muted)]"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} />Cargando información...</span></div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="grid min-h-48 place-items-center p-8 text-center"><div><p className="font-semibold">{title}</p><p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{text}</p></div></div>;
}

export function StatusPill({ kind, children }: { kind: "green" | "amber" | "gray"; children: React.ReactNode }) {
  const styles = kind === "green" ? "bg-emerald-50 text-emerald-700" : kind === "amber" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}
