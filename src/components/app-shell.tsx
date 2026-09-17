"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, LoaderCircle, LogOut, Settings, Users } from "lucide-react";

const links = [
  { href: "/", label: "Inicio", mobileLabel: "Inicio", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", mobileLabel: "Clientes", icon: Users },
  { href: "/calendario", label: "Calendario", mobileLabel: "Agenda", icon: CalendarDays },
  { href: "/pagos", label: "Pagos", mobileLabel: "Pagos", icon: CreditCard },
  { href: "/configuracion", label: "Configuración", mobileLabel: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  if (pathname === "/login") return <>{children}</>;

  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setLogoutError("No se pudo cerrar la sesión. Intenta nuevamente."); setLoggingOut(false);
    }
  }

  return <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
    {logoutError && <div role="alert" className="fixed right-4 top-4 z-50 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg">{logoutError}</div>}
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--line)] bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-[var(--line)] px-5"><Image src="/logo.png" alt="Logo de Samaniegas Management" width={43} height={43} priority className="size-[43px] rounded-md object-contain" /><div className="min-w-0"><p className="text-sm font-bold leading-tight">Samaniegas<br />Management</p><p className="mt-0.5 text-[10px] text-[var(--muted)]">Gestión del negocio</p></div></div>
      <nav className="flex-1 space-y-1 p-3">{links.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${active ? "bg-[var(--forest-soft)] text-[var(--forest)]" : "text-[var(--muted)] hover:bg-gray-50 hover:text-[var(--ink)]"}`}><Icon size={18} />{label}</Link>; })}</nav>
      <button onClick={logout} disabled={loggingOut} className="mx-4 mb-2 flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] text-sm font-semibold text-[var(--muted)] hover:bg-gray-50 hover:text-[var(--ink)]">{loggingOut ? <LoaderCircle size={17} className="animate-spin" /> : <LogOut size={17} />}{loggingOut ? "Saliendo..." : "Cerrar sesión"}</button>
    </aside>
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur lg:hidden"><div className="flex h-16 items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><Image src="/logo.png" alt="Logo de Samaniegas Management" width={36} height={36} priority className="size-9 rounded-md object-contain" /><span className="truncate text-sm font-bold">Samaniegas Management</span></span><button onClick={logout} disabled={loggingOut} className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-gray-100" aria-label="Cerrar sesión" title="Cerrar sesión">{loggingOut ? <LoaderCircle size={18} className="animate-spin" /> : <LogOut size={18} />}</button></div><nav className="grid grid-cols-5 gap-1 pb-2">{links.map(({ href, mobileLabel, icon: Icon }) => { const active = href === "/" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium ${active ? "bg-[var(--forest)] text-white" : "bg-gray-100 text-[var(--muted)]"}`}><Icon size={15} /><span className="truncate">{mobileLabel}</span></Link>; })}</nav></header>
    <main className="lg:pl-60"><div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div></main>
  </div>;
}
