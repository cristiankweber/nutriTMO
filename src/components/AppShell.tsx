import Link from "next/link";
import { Activity, ClipboardList, FileText, ListChecks, LogOut, ScrollText, ShieldCheck, UserRound, Utensils } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { canManageMenu, canManagePatients, canManagePrescriptions, canRegisterMeals, canReviewMeals, canViewAudit } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { roleLabels } from "@/lib/labels";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (role: SessionUser["role"]) => boolean;
};

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Atendimento",
    items: [
      { href: "/dashboard", label: "Unidade", description: "Leitos e alertas", icon: Activity, show: () => true },
      { href: "/patients", label: "Pacientes", description: "Admissao e historico", icon: UserRound, show: canManagePatients },
      { href: "/prescriptions", label: "Prescricao", description: "Metas do paciente", icon: ClipboardList, show: canManagePrescriptions },
      { href: "/meals/new", label: "Registrar ingesta", description: "Consumo real", icon: ListChecks, show: canRegisterMeals },
      { href: "/review", label: "Revisao", description: "Qualidade do registro", icon: ShieldCheck, show: canReviewMeals },
      { href: "/reports", label: "Relatorios", description: "Texto para prontuario", icon: FileText, show: () => true },
    ],
  },
  {
    title: "Configuracao",
    items: [
      { href: "/menu", label: "Base alimentar", description: "Itens de referencia", icon: Utensils, show: canManageMenu },
    ],
  },
  {
    title: "Governanca",
    items: [
      { href: "/audit", label: "Auditoria", description: "Logs e rastreio", icon: ScrollText, show: canViewAudit },
    ],
  },
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => item.show(user.role)) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f6f7f5] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 shadow-sm shadow-stone-200/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-800 text-sm font-bold tracking-wide text-white shadow-sm shadow-emerald-950/20">
              NT
            </span>
            <span>
              <span className="block text-base font-semibold leading-tight">NutriTMO</span>
              <span className="block text-xs text-stone-500">Documentacao nutricional auditavel</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-stone-500">{roleLabels[user.role]}</div>
            </div>
            <form action={logoutAction}>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-6">
        <nav
          aria-label="Navegacao principal"
          className="overflow-x-auto rounded-md border border-stone-200 bg-white p-2 shadow-sm shadow-stone-200/50 lg:sticky lg:top-20 lg:self-start"
        >
          <div className="flex min-w-max gap-4 lg:min-w-0 lg:flex-col lg:gap-4">
            {visibleSections.map((section) => (
              <div key={section.title} className="shrink-0 lg:shrink">
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase text-stone-400">{section.title}</div>
                <div className="flex gap-1 lg:flex-col">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.description}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-950 lg:w-full"
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-stone-500" />
                      <span className="min-w-0">
                        <span className="block truncate">{item.label}</span>
                        <span className="hidden truncate text-xs font-normal text-stone-500 lg:block">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
        <main className="min-w-0 pb-8">{children}</main>
      </div>
    </div>
  );
}
