import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Termos de Uso | KAIROS",
};

export default function TermosDeUsoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Termos de Uso</CardTitle>
          <CardDescription>
            Condições gerais para utilização da plataforma KAIROS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground whitespace-pre-wrap">
          Termos de Uso do KAIROS
1. Definições
1.1 Plataforma: Sistema SaaS denominado KAIROS, acessível via web (claude.ai) e aplicativos móveis, destinado à gestão e organização de estudos.

1.2 Usuário: Pessoa física, maior de 18 anos, que cria uma conta e utiliza a Plataforma.

1.3 Serviços: Funcionalidades oferecidas pela Plataforma, incluindo mas não limitadas a:

Gerenciamento de matérias e cronograma de estudos

Acompanhamento de metas diárias e estatísticas

Sistema de conquistas e gamificação

Robô de informativos jurídicos (Premium)

Calendário completo de planejamento (Premium)

1.4 Conta: Registro individual do Usuário na Plataforma, criado mediante fornecimento de email e senha.

1.5 Planos: Modalidades de assinatura disponíveis:

Gratuito: Acesso limitado a 2 matérias ativas e recursos básicos

Premium Mensal: Acesso completo mediante pagamento de R$ 19,99/mês

Premium Anual: Acesso completo mediante pagamento de R$ 180,00/ano

2. Aceitação dos Termos
2.1 Concordância: Ao criar uma conta no KAIROS, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com nossa Política de Privacidade.

2.2 Capacidade: Você declara ser maior de 18 anos e possuir capacidade jurídica plena para contratar e utilizar os Serviços.

2.3 Menores de Idade: Menores de 18 anos somente podem utilizar a Plataforma mediante autorização e supervisão de pais ou responsáveis legais.

2.4 Alterações: Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações substanciais serão notificadas via email com 15 dias de antecedência. O uso continuado da Plataforma após as alterações constitui aceitação dos novos termos.

3. Cadastro e Conta de Usuário
3.1 Criação de Conta: Para utilizar a Plataforma, você deve criar uma conta fornecendo:

Email válido (imutável após cadastro)

Senha segura (mínimo 8 caracteres)

Nome completo

Endereço completo (obrigatório para emissão de nota fiscal)

3.2 Veracidade dos Dados: Você se compromete a fornecer informações verdadeiras, completas e atualizadas. Informações falsas podem resultar na suspensão ou exclusão da conta.

3.3 Segurança da Conta: Você é responsável por:

Manter a confidencialidade de sua senha

Todas as atividades realizadas sob sua conta

Notificar imediatamente qualquer uso não autorizado

3.4 Email Imutável: O endereço de email cadastrado não pode ser alterado após a criação da conta. Em casos excepcionais, entre em contato com o suporte.

3.5 Exclusividade: Cada conta é pessoal e intransferível. É proibido compartilhar credenciais de acesso com terceiros.

4. Uso da Plataforma
4.1 Licença de Uso: Concedemos a você uma licença limitada, não exclusiva, intransferível e revogável para acessar e utilizar a Plataforma conforme estes Termos.

4.2 Uso Permitido: Você pode utilizar a Plataforma exclusivamente para fins pessoais de organização de estudos.

4.3 Uso Proibido: É expressamente proibido:

Utilizar a Plataforma para fins ilícitos ou não autorizados

Tentar acessar áreas restritas ou contas de outros usuários

Realizar engenharia reversa, descompilação ou desmontagem do código

Utilizar bots, scripts ou automações não autorizadas

Sobrecarregar ou prejudicar a infraestrutura da Plataforma

Revender ou redistribuir acesso à Plataforma

Explorar vulnerabilidades para obter vantagens indevidas (farming de conquistas)

4.4 Propriedade Intelectual: Todos os direitos de propriedade intelectual da Plataforma pertencem ao KAIROS. O uso não concede nenhum direito de propriedade sobre o software, marcas ou conteúdos.

5. Planos e Pagamentos
5.1 Planos Disponíveis:

Gratuito: Acesso permanente a funcionalidades básicas (2 matérias ativas, calendário semanal)

Premium Mensal: R$ 19,99/mês com acesso completo

Premium Anual: R$ 180,00/ano (economia de 25%)

5.2 Trial Gratuito: Novos usuários têm direito a 7 dias de trial gratuito ao contratar um plano Premium. Após o período:

Se não cancelado: cobrança automática e continuidade do plano

Se cancelado: nenhuma cobrança e retorno ao plano Gratuito

5.3 Pagamentos: Processados via Stripe. Você autoriza cobranças recorrentes até o cancelamento.

5.4 Renovação Automática: Planos renovam automaticamente no final de cada ciclo, salvo cancelamento prévio.

5.5 Impostos: Preços não incluem impostos aplicáveis, que serão adicionados conforme legislação local.

5.6 Atualizações de Preço: Preços podem ser alterados mediante notificação prévia de 30 dias. Alterações aplicam-se ao próximo ciclo de cobrança.

5.7 Sem Reembolso: Não oferecemos reembolsos após cobrança efetivada. O trial gratuito permite avaliar o serviço antes da cobrança.

6. Cancelamento e Downgrade
6.1 Cancelamento de Assinatura: Você pode cancelar sua assinatura Premium a qualquer momento via Stripe Customer Portal (acessível em Ajustes → Gerenciar Assinatura).

6.2 Efeitos do Cancelamento:

Durante Trial: cancelamento imediato sem cobrança

Após Trial: acesso mantido até o fim do período pago

Após período pago: downgrade automático para plano Gratuito

6.3 Downgrade Automático: Ao retornar ao plano Gratuito:

Matérias excedentes (além de 2) serão bloqueadas, mas não apagadas

Acesso a informativos será bloqueado

Calendário será restrito à visualização semanal

Nenhum dado será perdido (histórico, estatísticas, conquistas)

6.4 Reativação: Você pode reativar sua assinatura a qualquer momento:

Durante período pago: cancelamento do agendamento de cancelamento

Até 6 meses após: reativação sem novo trial

Após 6 meses: tratado como novo usuário

7. Dados e Privacidade
7.1 Coleta de Dados: Coletamos apenas dados necessários para a prestação dos Serviços, conforme detalhado em nossa Política de Privacidade.

7.2 Uso de Dados: Seus dados são utilizados exclusivamente para:

Funcionamento da Plataforma

Personalização da experiência

Comunicações essenciais

Melhorias no produto

7.3 Propriedade dos Dados: Você mantém a propriedade sobre todos os dados que insere na Plataforma (matérias, sessões, anotações).

7.4 Segurança: Implementamos medidas técnicas e organizacionais para proteger seus dados:

Criptografia em trânsito (HTTPS/TLS)

Row Level Security (RLS) no banco de dados

Autenticação via Supabase Auth

Isolamento multi-tenant (cada usuário acessa apenas seus dados)

7.5 Conformidade LGPD: Cumprimos integralmente a Lei Geral de Proteção de Dados (Lei 13.709/2018). Consulte nossa Política de Privacidade para detalhes.

8. Conteúdo do Usuário
8.1 Responsabilidade: Você é exclusivamente responsável por todo conteúdo que insere na Plataforma (matérias, anotações, configurações).

8.2 Licença para Operação: Ao inserir conteúdo, você concede ao KAIROS uma licença não exclusiva, gratuita e limitada para:

Armazenar e processar o conteúdo

Exibir o conteúdo para você

Realizar backups e garantir disponibilidade

8.3 Proibições: É proibido inserir conteúdo:

Ilegal, difamatório ou ofensivo

Que viole direitos de terceiros

Que contenha vírus ou códigos maliciosos

8.4 Remoção: Reservamo-nos o direito de remover conteúdo que viole estes Termos, sem aviso prévio.

9. Disponibilidade e Suporte
9.1 Disponibilidade: Nos esforçamos para manter a Plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta.

9.2 Manutenções: Podemos realizar manutenções programadas, notificadas com antecedência quando possível.

9.3 Suporte:

Plano Gratuito: suporte via comunidade

Plano Premium: suporte via email prioritário (suporte@kairos.app)

9.4 Sem Garantias: A Plataforma é fornecida "como está" (as is), sem garantias de qualquer natureza, expressas ou implícitas.

10. Limitação de Responsabilidade
10.1 Exclusão de Danos: Na máxima extensão permitida por lei, o KAIROS não será responsável por:

Danos indiretos, incidentais, especiais ou consequenciais

Perda de dados, lucros cessantes ou prejuízos

Uso ou impossibilidade de uso da Plataforma

Ações de terceiros

10.2 Limitação de Valor: Em caso de responsabilidade reconhecida, nossa obrigação está limitada ao valor pago por você nos 12 meses anteriores ao evento.

10.3 Backup: Recomendamos que você faça backup regular de seus dados importantes.

11. Suspensão e Encerramento
11.1 Suspensão por Violação: Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, em caso de:

Violação destes Termos

Atividade fraudulenta ou ilegal

Uso que prejudique a Plataforma ou outros usuários

11.2 Exclusão por Solicitação: Você pode excluir sua conta a qualquer momento via Ajustes → Privacidade → Excluir Conta. Esta ação:

É irreversível

Apaga permanentemente todos os seus dados

Cancela imediatamente qualquer assinatura ativa (sem reembolso)

11.3 Efeitos do Encerramento: Após o encerramento:

Acesso à Plataforma é imediatamente revogado

Dados são apagados permanentemente (exceto logs de auditoria por 90 dias para conformidade LGPD)

12. Disposições Gerais
12.1 Lei Aplicável: Estes Termos são regidos pelas leis da República Federativa do Brasil.

12.2 Foro: Fica eleito o foro da Comarca de Brasília/DF para dirimir quaisquer controvérsias.

12.3 Independência das Cláusulas: Se qualquer disposição for considerada inválida, as demais permanecerão em vigor.

12.4 Integralidade: Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre as partes.

12.5 Cessão: Você não pode ceder ou transferir seus direitos sob estes Termos. Podemos ceder nossos direitos mediante notificação.

12.6 Idioma: Em caso de tradução, a versão em português prevalece.

13. Contato
Para dúvidas, sugestões ou solicitações relacionadas a estes Termos de Uso:

Email: contato@kairos.app
Suporte: suporte@kairos.app
DPO (Encarregado de Dados): dpo@kairos.app

Ao utilizar o KAIROS, você confirma ter lido, compreendido e concordado com estes Termos de Uso.
        </CardContent>
      </Card>
    </div>
  );
}
