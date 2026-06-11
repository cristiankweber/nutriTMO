import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { canViewAudit } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { getReviewMetadataFromLog, reviewReasonLabels } from "@/lib/review/rules";

export const dynamic = "force-dynamic";

type AuditLogEntry = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  beforeJson: unknown;
  afterJson: unknown;
  user: { name: string } | null;
};

export default async function AuditPage() {
  const user = await requireUser();
  if (!canViewAudit(user.role)) {
    return (
      <AppShell user={user}>
        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/50">
          <h1 className="text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            A auditoria fica na area de Governanca e esta disponivel apenas para perfis com permissao de rastreabilidade.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
          >
            Voltar para Atendimento
          </Link>
        </div>
      </AppShell>
    );
  }

  const logs = await db.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="mt-1 text-sm text-stone-600">Historico de login, exportacoes e alteracoes assistenciais relevantes.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
          Nenhum evento de auditoria registrado ainda.
        </div>
      ) : null}

      <div className="space-y-3 lg:hidden">
        {logs.map((log) => (
          <AuditMobileCard key={log.id} log={log} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm shadow-stone-200/50 lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-100/80 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th>Usuario</th>
              <th>Acao</th>
              <th>Entidade</th>
              <th>Antes</th>
              <th>Depois</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-stone-100 align-top">
                <td className="px-4 py-3">{formatDateTime(log.createdAt)}</td>
                <td className="py-3">{log.user?.name ?? "Sistema"}</td>
                <td className="py-3 font-semibold">{log.action}</td>
                <td className="py-3">{log.entityType}</td>
                <td className="max-w-xs py-3">
                  <JsonDetails label="Antes JSON" value={log.beforeJson} />
                </td>
                <td className="max-w-xs py-3 pr-4">
                  {log.action === "REVIEW" ? <AuditReviewSummary beforeJson={log.beforeJson} afterJson={log.afterJson} /> : null}
                  {isCancellationLog(log.afterJson) ? <AuditCancellationSummary afterJson={log.afterJson} /> : null}
                  <JsonDetails label="Depois JSON" value={log.afterJson} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function AuditMobileCard({ log }: { log: AuditLogEntry }) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 text-sm shadow-sm shadow-stone-200/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-stone-500">{formatDateTime(log.createdAt)}</div>
          <div className="mt-1 font-semibold text-stone-950">{log.user?.name ?? "Sistema"}</div>
        </div>
        <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700">
          {log.action}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <AuditFact label="Entidade" value={log.entityType} />
        <AuditFact label="Evento" value={log.action} />
      </div>
      {log.action === "REVIEW" ? <AuditReviewSummary beforeJson={log.beforeJson} afterJson={log.afterJson} /> : null}
      {isCancellationLog(log.afterJson) ? <AuditCancellationSummary afterJson={log.afterJson} /> : null}
      <div className="mt-3 space-y-2">
        <JsonDetails label="Antes JSON" value={log.beforeJson} />
        <JsonDetails label="Depois JSON" value={log.afterJson} />
      </div>
    </article>
  );
}

function AuditFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <div className="text-[10px] font-semibold uppercase text-stone-500">{label}</div>
      <div className="mt-1 truncate font-medium text-stone-800">{value}</div>
    </div>
  );
}

function AuditReviewSummary({ beforeJson, afterJson }: { beforeJson: unknown; afterJson: unknown }) {
  const metadata = getReviewMetadataFromLog(beforeJson, afterJson);
  const changedDiffs = metadata.percentDiffs.filter((diff) => diff.changed);

  return (
    <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-950">
      <div className="font-semibold">Resumo da revisao</div>
      <div className="mt-1">Motivos: {metadata.reasons.map((reason) => reviewReasonLabels[reason]).join(", ")}</div>
      <div>
        Percentuais:{" "}
        {changedDiffs.length > 0
          ? changedDiffs.map((diff) => `${diff.beforePercent} -> ${diff.afterPercent}`).join(", ")
          : "sem mudanca registrada"}
      </div>
      {metadata.observation ? <div>Observacao: {metadata.observation}</div> : null}
    </div>
  );
}

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (!value) {
    return <div className="rounded-md border border-stone-200 bg-stone-50/80 p-2 text-xs text-stone-500">-</div>;
  }

  return (
    <details className="rounded-md border border-stone-200 bg-stone-50/80 text-xs">
      <summary className="cursor-pointer list-none px-3 py-2 font-semibold text-stone-700 [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <pre className="max-h-52 overflow-auto border-t border-stone-200 p-3 text-[11px] leading-5 text-stone-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function AuditCancellationSummary({ afterJson }: { afterJson: unknown }) {
  const after = asRecord(afterJson);
  const reason = after?.cancellationReason ?? after?.notes;

  return (
    <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-950">
      <div className="font-semibold">Resumo do cancelamento</div>
      <div className="mt-1">Status: cancelada sem exclusao do registro.</div>
      <div>Motivo: {typeof reason === "string" && reason.trim() ? reason : "nao registrado"}</div>
    </div>
  );
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const isCancellationLog = (afterJson: unknown) => {
  const after = asRecord(afterJson);
  return after?.status === "CANCELADA" || typeof after?.cancellationReason === "string";
};
