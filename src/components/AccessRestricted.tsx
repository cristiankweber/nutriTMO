import Link from "next/link";

export function AccessRestricted({
  title = "Acesso restrito",
  description,
  href = "/dashboard",
  cta = "Voltar",
}: {
  title?: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/50">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
      >
        {cta}
      </Link>
    </div>
  );
}
