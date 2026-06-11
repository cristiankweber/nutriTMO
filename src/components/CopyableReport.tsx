"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { logReportExportAction } from "@/lib/actions";

export function CopyableReport({
  admissionId,
  text,
  title = "Texto copiavel para prontuario",
}: {
  admissionId: string;
  text: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = async () => {
    try {
      await writeClipboardText(text);
    } catch {
      setCopied(false);
      setCopyError("Nao foi possivel copiar automaticamente. Selecione o texto e copie manualmente.");
      return;
    }

    const formData = new FormData();
    formData.set("admissionId", admissionId);
    formData.set("reportText", text);
    setCopied(true);
    setCopyError(null);
    startTransition(() => {
      void logReportExportAction(formData);
    });
  };

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-950">{title}</h2>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {pending ? "Registrando..." : copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        className="min-h-40 w-full rounded-md border border-stone-200 bg-stone-50/80 p-3 text-sm leading-6 text-stone-900 shadow-inner shadow-stone-200/50 focus:bg-white"
      />
      {copyError ? <p className="mt-2 text-sm font-medium text-rose-800">{copyError}</p> : null}
    </div>
  );
}

async function writeClipboardText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back to a local selection copy for constrained browser contexts.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Copy command failed.");
  } finally {
    document.body.removeChild(textarea);
  }
}
