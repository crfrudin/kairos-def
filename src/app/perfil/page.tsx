import { ProfileEditShell } from '@/features/profile';

export default async function PerfilPage() {
  // BLOCO 6.2 (parcial):
  // - Esta página será server-side.
  // - Aqui vamos buscar o contrato via UC-01 e passar como props para a UI.
  // - A UI continuará sendo input-only.
  return (
    <main className="mx-auto max-w-3xl p-6">
      <ProfileEditShell />
    </main>
  );
}
