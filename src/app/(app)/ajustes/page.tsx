import 'server-only';

import { loadUserAdministrativeProfileAction } from './actions';
import { UserAdministrativeProfileForm } from './UserAdministrativeProfileForm';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function AjustesPage() {
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
      <UserAdministrativeProfileForm initialProfile={loaded.profile} completeness={loaded.completeness} />
    </main>
  );
}
