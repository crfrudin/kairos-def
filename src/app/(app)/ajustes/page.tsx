import 'server-only';

import { loadUserAdministrativeProfileAction } from './actions';
import { UserAdministrativeProfileForm } from './UserAdministrativeProfileForm';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Reason = 'billing_profile_incomplete' | 'legal_not_accepted';

function normalizeReason(v: unknown): Reason | null {
  const s = String(v ?? '').trim();
  if (s === 'billing_profile_incomplete') return 'billing_profile_incomplete';
  if (s === 'legal_not_accepted') return 'legal_not_accepted';
  return null;
}

export default async function AjustesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const rawReason = Array.isArray(sp.reason) ? sp.reason[0] : sp.reason;
  const reason = normalizeReason(rawReason);

  const loaded = await loadUserAdministrativeProfileAction();

  if (!loaded.ok) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{loaded.error}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Ajustes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Não foi possível carregar seus dados pessoais e complementares.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
<UserAdministrativeProfileForm
  initialProfile={loaded.profile}
  completeness={loaded.completeness}
  legal={loaded.legal}
/>
    </main>
  );
}
