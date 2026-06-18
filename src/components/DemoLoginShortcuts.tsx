"use client";

const demoAccounts = [
  { label: "Nutricao", email: "nutricao@nutritmo.local" },
  { label: "Admin", email: "admin@nutritmo.local" },
  { label: "Enfermagem", email: "enfermagem@nutritmo.local" },
  { label: "Medico", email: "medico@nutritmo.local" },
  { label: "Auditor", email: "auditor@nutritmo.local" },
] as const;

export function DemoLoginShortcuts() {
  const fillDemoAccount = (email: string) => {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (!emailInput || !passwordInput) return;
    emailInput.value = email;
    passwordInput.value = "nutritmo123";
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-semibold uppercase text-stone-500">Atalhos demo</div>
      <div className="flex flex-wrap gap-2">
        {demoAccounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => fillDemoAccount(account.email)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            {account.label}
          </button>
        ))}
      </div>
    </div>
  );
}
