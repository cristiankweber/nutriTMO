import { redirect } from "next/navigation";
import { loginAction } from "@/lib/auth/actions";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(defaultRouteForRole(user.role));
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f5] px-4 py-10 text-stone-950">
      <div className="w-full max-w-md rounded-md border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/70">
        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-emerald-800 font-bold tracking-tight text-white shadow-sm shadow-emerald-900/20">NT</div>
          <h1 className="text-2xl font-semibold">NutriTMO</h1>
          <p className="mt-1 text-sm text-stone-600">Documentacao nutricional estruturada para unidade TMO.</p>
        </div>
        {params.erro ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            Credenciais invalidas.
          </div>
        ) : null}
        <form action={loginAction} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input name="email" type="email" className="w-full rounded-md border border-stone-300 px-3 py-2" defaultValue="nutricao@nutritmo.local" required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Senha</span>
            <input name="password" type="password" className="w-full rounded-md border border-stone-300 px-3 py-2" defaultValue="nutritmo123" required />
          </label>
          <button className="w-full rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-900">Entrar</button>
        </form>
        <div className="mt-5 rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-600">
          Usuarios demo: admin, nutricao, enfermagem, medico ou auditor em <code>@nutritmo.local</code>. Senha: <code>nutritmo123</code>.
        </div>
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          Ambiente local demonstrativo. Nao use pacientes, prontuarios ou imagens reais; acessos e exportacoes sao auditados.
        </div>
      </div>
    </main>
  );
}
