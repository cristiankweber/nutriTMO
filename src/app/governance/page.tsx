import {
  DatabaseZap,
  FileWarning,
  Image as ImageIcon,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { AccessRestricted } from "@/components/AccessRestricted";
import { AppShell } from "@/components/AppShell";
import { purgeExpiredImagesAction } from "@/lib/actions";
import {
  canManageGovernance,
  canViewDashboard,
  canViewGovernance,
  canViewReports,
  canViewAudit,
  canViewClinicalRecord,
  canRegisterMeals,
  canReviewMeals,
  canManageMenu,
  canManagePatients,
  canManagePrescriptions,
} from "@/lib/auth/permissions";
import { requireUser, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { getImageRetentionCutoff, getImageRetentionDays } from "@/lib/storage/retention";
import type { Role } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const roleOrder: Role[] = ["ADMIN", "NUTRICAO", "ENFERMAGEM", "MEDICO", "AUDITOR"];

const permissionChecks = [
  { label: "Dashboard", allowed: canViewDashboard },
  { label: "Detalhe clinico", allowed: canViewClinicalRecord },
  { label: "Registrar refeicao", allowed: canRegisterMeals },
  { label: "Revisar/cancelar", allowed: canReviewMeals },
  { label: "Prescricao", allowed: canManagePrescriptions },
  { label: "Cardapio", allowed: canManageMenu },
  { label: "Pacientes/admissoes", allowed: canManagePatients },
  { label: "Relatorios", allowed: canViewReports },
  { label: "Auditoria", allowed: canViewAudit },
  { label: "Governanca", allowed: canViewGovernance },
];

export default async function GovernancePage({ searchParams }: { searchParams: Promise<{ retencao?: string }> }) {
  const user = await requireUser();
  if (!canViewGovernance(user.role)) {
    return (
      <AppShell user={user}>
        <AccessRestricted
          description="Governanca, retencao local e matriz de permissoes ficam disponiveis apenas para admin e auditor."
        />
      </AppShell>
    );
  }

  const params = await searchParams;
  const now = new Date();
  const retentionDays = getImageRetentionDays();
  const cutoff = getImageRetentionCutoff(now);
  const [imageCount, identifierImageCount, expiredImageCount, oldestImage, auditCount] = await Promise.all([
    db.imageAsset.count(),
    db.imageAsset.count({ where: { containsPotentialIdentifier: true } }),
    db.imageAsset.count({ where: { createdAt: { lt: cutoff } } }),
    db.imageAsset.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.auditLog.count(),
  ]);

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Governanca e seguranca</h1>
        <p className="mt-1 text-sm text-stone-600">
          Perfis, sessao, retencao de imagens locais, pseudonimizacao e avisos LGPD antes de piloto.
        </p>
      </div>

      {params.retencao === "limpa" ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
          Retencao local executada e registrada na auditoria.
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <GovernanceMetric
          icon={LockKeyhole}
          label="Sessao"
          value={`${SESSION_MAX_AGE_SECONDS / 3600}h`}
          detail="Cookie HttpOnly, SameSite Strict e payload sem e-mail."
        />
        <GovernanceMetric
          icon={ImageIcon}
          label="Imagens locais"
          value={`${imageCount}`}
          detail={`${identifierImageCount} marcada(s) com possivel identificador.`}
        />
        <GovernanceMetric
          icon={Trash2}
          label="Retencao"
          value={`${retentionDays} dias`}
          detail={`${expiredImageCount} imagem(ns) acima do prazo em ${formatDate(cutoff)}.`}
        />
        <GovernanceMetric
          icon={DatabaseZap}
          label="Auditoria"
          value={`${auditCount}`}
          detail="Eventos locais de login, exportacao e alteracoes assistenciais."
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <div className="mb-3 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-emerald-900" />
            <h2 className="text-lg font-semibold">Matriz de permissoes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-100/80 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-3 py-3">Perfil</th>
                  {permissionChecks.map((permission) => (
                    <th key={permission.label} className="px-2 py-3">
                      {permission.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roleOrder.map((role) => (
                  <tr key={role} className="border-b border-stone-100">
                    <td className="px-3 py-3 font-semibold">{roleLabels[role]}</td>
                    {permissionChecks.map((permission) => (
                      <td key={permission.label} className="px-2 py-3">
                        <PermissionMark allowed={permission.allowed(role)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-emerald-900" />
            <h2 className="text-lg font-semibold">Retencao de imagens</h2>
          </div>
          <div className="space-y-3 text-sm text-stone-700">
            <GovernanceFact label="Pasta local" value="IMAGE_STORAGE_DIR" />
            <GovernanceFact label="Arquivo mais antigo" value={oldestImage ? formatDateTime(oldestImage.createdAt) : "sem imagens"} />
            <GovernanceFact label="Corte atual" value={`antes de ${formatDate(cutoff)}`} />
            <GovernanceFact label="Servir arquivo" value="somente dentro da pasta configurada" />
          </div>
          {canManageGovernance(user.role) ? (
            <form action={purgeExpiredImagesAction} className="mt-4">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> Executar limpeza vencida
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-md bg-stone-50 p-3 text-sm text-stone-600">Auditor visualiza a politica, mas nao executa limpeza.</p>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <GovernancePanel
          icon={ShieldCheck}
          title="Pseudonimizacao"
          items={[
            "Telas usam codigo interno e leito como identificadores operacionais.",
            "Cookie de sessao guarda id, nome e perfil, sem e-mail.",
            "Uploads usam UUID e nome original generico para reduzir metadados identificaveis.",
          ]}
        />
        <GovernancePanel
          icon={FileWarning}
          title="Mensagens LGPD"
          items={[
            "Login e formulario de refeicao avisam para nao usar dados ou imagens reais no MVP.",
            "Documentacao declara uso local demonstrativo, sem Google Sheets e sem IA visual real.",
            "Piloto real ainda depende de base legal, RIPD, seguranca institucional e responsavel LGPD.",
          ]}
        />
        <GovernancePanel
          icon={LockKeyhole}
          title="Antes do piloto"
          items={[
            "Definir controlador, operador, encarregado e fluxo de incidente.",
            "Trocar storage local por politica institucional com backup e criptografia.",
            "Revisar matriz com seguranca da informacao, assistencia e area juridica.",
          ]}
        />
      </div>
    </AppShell>
  );
}

function GovernanceMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-4 w-4 text-emerald-900" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-stone-950">{value}</div>
      <p className="mt-1 text-sm text-stone-600">{detail}</p>
    </div>
  );
}

function PermissionMark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-950">Sim</span>
  ) : (
    <span className="inline-flex rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">Nao</span>
  );
}

function GovernanceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <div className="text-[10px] font-semibold uppercase text-stone-500">{label}</div>
      <div className="mt-1 font-medium text-stone-900">{value}</div>
    </div>
  );
}

function GovernancePanel({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-900" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <ul className="space-y-2 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-stone-50 p-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
