import "server-only";

import { Suspense } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ProfileStatusCard } from "@/app/(app)/dashboard/components/ProfileStatusCard";
import { DailyGoalStatusCard } from "@/app/(app)/dashboard/components/DailyGoalStatusCard";
import { AuthStatusCard } from "@/app/(app)/dashboard/components/AuthStatusCard";
import { AdministrativeProfileStatusCard } from "@/app/(app)/dashboard/components/AdministrativeProfileStatusCard";

function CardSkeleton(props: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-5 w-full" />
      </CardContent>
    </Card>
  );
}

function FuturePlaceholderCard(props: { title: string; description: string; href: string }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <CardTitle>{props.title}</CardTitle>
          <Badge variant="secondary">Em breve</Badge>
        </div>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={props.href} aria-label={`Abrir página placeholder: ${props.title}`}>
            Ver detalhes
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton title="Perfil" />}>
          <ProfileStatusCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Meta Diária" />}>
          <DailyGoalStatusCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Autenticação" />}>
          <AuthStatusCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Dados administrativos" />}>
          <AdministrativeProfileStatusCard />
        </Suspense>

        <FuturePlaceholderCard
          title="Estatísticas"
          description="Métricas e análises do seu estudo (Fase 4). Placeholder informativo."
          href="/estatisticas"
        />

        <FuturePlaceholderCard
          title="Conquistas"
          description="Gamificação, streak e conquistas (Fase 5). Placeholder informativo."
          href="/conquistas"
        />

        <FuturePlaceholderCard
          title="Assinatura"
          description="Plano e monetização (Fase 7). Placeholder informativo."
          href="/assinatura"
        />
      </div>
    </div>
  );
}
