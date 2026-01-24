import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { CheckoutButtons } from "./CheckoutButtons.client";

type CheckoutState = "success" | "cancelled" | "error" | null;

function getCheckoutState(searchParams: Record<string, string | string[] | undefined>): CheckoutState {
  const v = searchParams.checkout;
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === "success" || raw === "cancelled" || raw === "error") return raw;
  return null;
}

function getSessionId(searchParams: Record<string, string | string[] | undefined>): string {
  const v = searchParams.session_id;
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === "string" ? raw : "";
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const checkoutState = getCheckoutState(sp);
  const sessionId = getSessionId(sp);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* HERO */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Assinatura KAIROS</h1>
          <Badge variant="secondary">Premium</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          A assinatura controla apenas acesso a funcionalidades auxiliares. Ela não altera regras, metas ou decisões do
          seu estudo.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard" aria-label="Voltar ao dashboard">
              Voltar ao dashboard
            </Link>
          </Button>

          <CheckoutButtons />
        </div>
      </div>

      {/* Feedback pós-checkout */}
      {checkoutState && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Checkout</CardTitle>
            <CardDescription>Status retornado pelo Stripe (TEST).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {checkoutState === "success" && (
              <div className="space-y-2">
                <p className="text-foreground font-medium">✅ Compra TEST concluída.</p>
                <p>
                  Se o webhook estiver ouvindo, o sistema deve materializar o estado premium após processar{" "}
                  <span className="font-medium text-foreground">checkout.session.completed</span>.
                </p>
                {sessionId ? (
                  <p>
                    <span className="font-medium text-foreground">session_id:</span> {sessionId}
                  </p>
                ) : null}
              </div>
            )}

            {checkoutState === "cancelled" && (
              <div className="space-y-2">
                <p className="text-foreground font-medium">⚠️ Checkout cancelado antes da confirmação.</p>
                <p>Nenhuma mudança deve ocorrer no estado de assinatura.</p>
              </div>
            )}

            {checkoutState === "error" && (
              <div className="space-y-2">
                <p className="text-foreground font-medium">❌ Erro ao iniciar o checkout.</p>
                <p>Veja o console do navegador e o terminal do Next para detalhes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PLANOS */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Plano Gratuito (FREE)</CardTitle>
            <CardDescription>Essencial para estudar com método, disciplina e previsibilidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              O plano gratuito oferece acesso completo ao núcleo funcional do KAIROS. Você pode estudar normalmente, com
              planejamento determinístico e execução histórica preservada.
            </p>
            <ul className="list-disc pl-5">
              <li>Estudo diário completo</li>
              <li>Geração de meta e calendário</li>
              <li>Execução e histórico</li>
              <li>Progresso básico</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Plano Premium</CardTitle>
              <Badge variant="secondary">Premium</Badge>
            </div>
            <CardDescription>Ferramentas extras de visualização, análise e organização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              O plano Premium libera ferramentas adicionais de visualização, análise e organização. Ele{" "}
              <span className="font-medium text-foreground">não altera</span> regras de estudo, planejamento ou execução.
            </p>
            <ul className="list-disc pl-5">
              <li>Estatísticas avançadas</li>
              <li>Visualizações detalhadas</li>
              <li>Relatórios e exportações</li>
              <li>Organização ampliada</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* COMPARATIVO (informativo) */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo</CardTitle>
          <CardDescription>Informativo. A assinatura controla apenas acesso a funcionalidades auxiliares.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionalidade</TableHead>
                <TableHead>FREE</TableHead>
                <TableHead>PREMIUM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Estudo e planejamento</TableCell>
                <TableCell>✅</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Execução diária</TableCell>
                <TableCell>✅</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Histórico</TableCell>
                <TableCell>✅</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Estatísticas básicas</TableCell>
                <TableCell>✅</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Estatísticas avançadas</TableCell>
                <TableCell>❌</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Relatórios</TableCell>
                <TableCell>❌</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Matérias ativas simultâneas</TableCell>
                <TableCell className="font-medium">Limitado pelo plano</TableCell>
                <TableCell>✅</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="px-6 pb-6 pt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              O limite de matérias no plano gratuito não altera regras de estudo, planejamento ou execução.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* O PREMIUM NÃO FAZ */}
      <Card>
        <CardHeader>
          <CardTitle>O que o Premium não faz</CardTitle>
          <CardDescription>Clareza intencional: assinatura não muda regras do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>não muda regras de estudo</li>
            <li>não altera metas diárias</li>
            <li>não interfere no planejamento</li>
            <li>não cria atalhos ou exceções</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
