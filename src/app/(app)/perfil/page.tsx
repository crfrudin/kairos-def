import { ProfileEditShell } from '@/features/profile';
import { loadProfileAction } from './actions';

export default async function PerfilPage() {
  const loaded = await loadProfileAction();

  const authStatusMessage = loaded.ok ? undefined : loaded.error;

  const initialContractJson =
    loaded.ok && loaded.contract ? JSON.stringify(loaded.contract, null, 2) : '';

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ProfileEditShell
        initialContractJson={initialContractJson}
        authStatusMessage={authStatusMessage}
      />
    </main>
  );
}
