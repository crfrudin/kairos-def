import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Política de Privacidade e Proteção de Dados | KAIROS",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Política de Privacidade e Proteção de Dados</CardTitle>
          <CardDescription>
            Informações sobre coleta, uso e proteção de dados pessoais no KAIROS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground whitespace-pre-wrap">
          Política de Privacidade e Proteção de Dados (LGPD)
1. Definições (LGPD)
1.1 Dados Pessoais: Informações relacionadas a pessoa natural identificada ou identificável (Art. 5º, I).

1.2 Titular: Você, pessoa natural a quem se referem os dados pessoais (Art. 5º, V).

1.3 Controlador: KAIROS, responsável pelas decisões sobre o tratamento de dados pessoais (Art. 5º, VI).

1.4 Tratamento: Toda operação com dados pessoais: coleta, armazenamento, uso, compartilhamento, exclusão (Art. 5º, X).

1.5 Consentimento: Manifestação livre, informada e inequívoca pela qual você concorda com o tratamento de seus dados (Art. 5º, XII).

1.6 Anonimização: Processo que torna dados não identificáveis, de forma irreversível (Art. 5º, XI).

2. Identificação do Controlador
Controlador de Dados:
KAIROS - Plataforma de Gestão de Estudos
CNPJ: [A DEFINIR]
Sede: Brasília/DF, Brasil

Encarregado de Proteção de Dados (DPO):
Nome: [A DEFINIR]
Email: dpo@kairos.app
Telefone: [A DEFINIR]

Canal de Comunicação:
Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato com nosso DPO através dos canais acima.

3. Dados Coletados
3.1 Dados Fornecidos por Você:

Obrigatórios (cadastro inicial):

Email (login e comunicações)

Senha (autenticação - armazenada em hash via Supabase Auth)

Obrigatórios (onboarding):

Nome completo

Gênero

Endereço completo (CEP, rua, número, complemento, bairro, cidade, estado)

Opcionais:

Nome social

Telefone

Foto de perfil (avatar)

3.2 Dados Gerados pelo Uso:

Matérias cadastradas (nome, progresso, trilhas)

Sessões de estudo (data, duração, atividades)

Metas diárias e cronogramas

Estatísticas de desempenho

Conquistas desbloqueadas

Informativos lidos

Configurações de estudo (modo FIXO/CICLO, horários)

3.3 Dados Técnicos (automáticos):

Endereço IP

Tipo de navegador e dispositivo

Data e hora de acesso

Páginas visitadas

Ações realizadas na Plataforma

3.4 Dados de Pagamento:

Processados diretamente pelo Stripe (não armazenamos dados de cartão)

Armazenamos apenas: ID do cliente Stripe, status da assinatura, histórico de transações

4. Base Legal e Finalidades do Tratamento
Tratamos seus dados com base nas seguintes hipóteses legais (Art. 7º e 11 da LGPD):

4.1 Execução de Contrato (Art. 7º, V):

Dados de cadastro e onboarding: necessários para prestação dos Serviços

Dados de estudo: funcionamento das funcionalidades contratadas

Finalidade: Fornecer a Plataforma e suas funcionalidades

4.2 Consentimento (Art. 7º, I):

Foto de perfil (opcional)

Comunicações de marketing (opt-in)

Finalidade: Personalização da experiência e comunicações promocionais

4.3 Legítimo Interesse (Art. 7º, IX):

Dados técnicos e de uso: melhoria da Plataforma, segurança, prevenção de fraudes

Finalidade: Garantir segurança, prevenir abusos, otimizar funcionalidades

4.4 Cumprimento de Obrigação Legal (Art. 7º, II):

Dados fiscais (endereço): emissão de nota fiscal

Logs de auditoria: conformidade legal

Finalidade: Atender obrigações tributárias e regulatórias

4.5 Exercício de Direitos (Art. 7º, VI):

Histórico de ações sensíveis: exclusão de conta, alteração de senha

Finalidade: Defesa em processos judiciais ou administrativos

5. Como Utilizamos Seus Dados
5.1 Prestação dos Serviços:

Criar e gerenciar sua conta

Processar e armazenar seus dados de estudo

Calcular estatísticas e projeções

Gerar metas diárias e cronogramas

Conceder conquistas

5.2 Comunicações:

Emails essenciais (confirmação de cadastro, redefinição de senha)

Emails transacionais (confirmação de assinatura, falha de pagamento)

Emails promocionais (somente com seu consentimento - opt-in)

5.3 Pagamentos:

Gerenciar assinaturas via Stripe

Processar pagamentos e emitir notas fiscais

5.4 Melhorias e Análises:

Análise de uso agregado e anonimizado

Identificação de bugs e problemas

Desenvolvimento de novas funcionalidades

5.5 Segurança:

Prevenir fraudes e abusos

Detectar atividades suspeitas

Garantir cumprimento dos Termos de Uso

6. Compartilhamento de Dados
6.1 Não Vendemos Dados: Nunca vendemos, alugamos ou comercializamos seus dados pessoais.

6.2 Compartilhamento Necessário:

Stripe (Processamento de Pagamentos):

Dados compartilhados: email, nome, endereço

Finalidade: processar pagamentos de assinatura

Base legal: execução de contrato

Localização: Estados Unidos (adequação via Standard Contractual Clauses)

Supabase (Infraestrutura):

Dados compartilhados: todos os dados da Plataforma

Finalidade: hospedagem e banco de dados

Base legal: execução de contrato

Localização: [Região configurada - ex: us-east-1]

ViaCEP (Busca de Endereço):

Dados compartilhados: CEP

Finalidade: autocompletar endereço

Base legal: legítimo interesse (facilitar cadastro)

Observação: API pública, sem armazenamento

6.3 Compartilhamento Legal:
Podemos compartilhar dados quando exigido por:

Ordem judicial ou requisição legal

Autoridades competentes (Polícia, Ministério Público, ANPD)

Defesa de direitos do KAIROS em processos judiciais

6.4 Não Compartilhamos com:

Anunciantes ou empresas de marketing

Redes sociais (exceto se você optar por compartilhar conquistas)

Outros usuários (dados são estritamente individuais)

7. Armazenamento e Segurança
7.1 Localização dos Dados:

Servidores: Supabase (região [A DEFINIR])

Backup: região secundária para redundância

7.2 Prazo de Retenção:

Conta ativa: dados mantidos enquanto a conta existir

Conta excluída: hard delete imediato (exceto logs de auditoria)

Logs de auditoria: 90 dias após exclusão (conformidade LGPD Art. 16)

Dados anonimizados: mantidos indefinidamente para estatísticas agregadas

7.3 Medidas de Segurança Técnicas:

Criptografia em trânsito (HTTPS/TLS 1.3)

Autenticação via Supabase Auth (bcrypt para senhas)

Row Level Security (RLS) no PostgreSQL

Isolamento multi-tenant (cada usuário acessa apenas seus dados)

Backups automáticos diários

Auditoria de acessos sensíveis

7.4 Medidas de Segurança Organizacionais:

Acesso aos dados restrito a pessoal autorizado

Treinamento de equipe em proteção de dados

Política de resposta a incidentes

Testes de segurança periódicos

7.5 Notificação de Incidentes:
Em caso de violação de dados, notificaremos:

ANPD (Autoridade Nacional de Proteção de Dados) em até 72h

Você, se houver risco aos seus direitos (via email)

8. Seus Direitos (Art. 18 da LGPD)
Como titular de dados, você tem os seguintes direitos:

8.1 Confirmação e Acesso (Art. 18, I e II):

Confirmar se tratamos seus dados

Acessar todos os dados que possuímos sobre você

Como exercer: via Ajustes → Privacidade → Exportar Dados

8.2 Correção (Art. 18, III):

Corrigir dados incompletos, inexatos ou desatualizados

Como exercer: via Ajustes → Dados Pessoais

8.3 Anonimização, Bloqueio ou Eliminação (Art. 18, IV):

Solicitar anonimização de dados desnecessários

Bloquear ou eliminar dados excessivos ou tratados irregularmente

Como exercer: contato com DPO (dpo@kairos.app)

8.4 Portabilidade (Art. 18, V):

Receber seus dados em formato estruturado (JSON)

Como exercer: via Ajustes → Privacidade → Exportar Dados

8.5 Eliminação (Art. 18, VI):

Excluir sua conta e todos os dados permanentemente

Como exercer: via Ajustes → Privacidade → Excluir Conta

Atenção: Ação irreversível

8.6 Informação sobre Compartilhamento (Art. 18, VII):

Saber com quem compartilhamos seus dados

Como exercer: consultar seção 6 desta Política ou contatar DPO

8.7 Revogação de Consentimento (Art. 18, IX):

Retirar consentimento para comunicações de marketing

Como exercer: via Ajustes → Preferências → Comunicação

8.8 Oposição (Art. 18, § 2º):

Opor-se a tratamento baseado em legítimo interesse

Como exercer: contato com DPO explicando os motivos

8.9 Prazo de Resposta: Responderemos às suas solicitações em até 15 dias úteis.

9. Exportação de Dados (Portabilidade)
9.1 Formato: JSON estruturado e legível

9.2 Dados Incluídos:

Perfil completo (nome, email, telefone, endereço)

Matérias cadastradas (incluindo bloqueadas)

Sessões de estudo (histórico completo)

Metas diárias (executadas)

Estatísticas calculadas

Conquistas desbloqueadas

Informativos lidos

Configurações de estudo

9.3 Processo:

Acesse Ajustes → Privacidade → Exportar Dados

Confirme a solicitação

Receba email com link de download (válido por 24h)

Baixe o arquivo JSON

9.4 Segurança:

Link único e temporário

Acesso restrito ao email cadastrado

Arquivo protegido por autenticação

10. Exclusão de Conta e Direito ao Esquecimento
10.1 Como Excluir: Ajustes → Privacidade → Excluir Conta

10.2 Confirmações Necessárias:

Digitar senha atual

Marcar checkbox de ciência da irreversibilidade

Digitar "EXCLUIR" (em maiúsculas)

10.3 Efeitos Imediatos:

Conta desativada instantaneamente

Hard delete de todos os dados:

Perfil e configurações

Matérias e trilhas

Sessões de estudo

Estatísticas e conquistas

Avatares e anexos

Cancelamento de assinatura (sem reembolso)

Logout automático

10.4 Dados Não Excluídos:

Logs de auditoria (mantidos por 90 dias - Art. 16 LGPD)

Dados já anonimizados em estatísticas agregadas

10.5 Irreversibilidade: Atenção: Esta ação é permanente e não pode ser desfeita. Todos os seus dados de estudo serão perdidos.

11. Cookies e Tecnologias Similares
11.1 Uso de Cookies: Utilizamos cookies essenciais para funcionamento da Plataforma:

Cookies Essenciais (obrigatórios):

Sessão de autenticação (Supabase Auth)

Preferências de tema (dark/light)

Token CSRF (segurança)

Não utilizamos:

Cookies de marketing ou publicidade

Cookies de rastreamento entre sites

Cookies de redes sociais (exceto quando você escolhe compartilhar)

11.2 Gerenciamento: Você pode limpar cookies via configurações do navegador, mas isso pode afetar o funcionamento da Plataforma.

12. Menores de Idade
12.1 Idade Mínima: A Plataforma é destinada a maiores de 18 anos.

12.2 Menores: Menores de 18 anos podem utilizar mediante:

Autorização expressa de pais/responsáveis

Supervisão contínua do responsável legal

Responsabilidade do adulto por todas as ações

12.3 Verificação: Ao criar conta, o usuário declara ter 18 anos ou mais.

12.4 Conhecimento de Uso Indevido: Se identificarmos uso por menor sem autorização, a conta será suspensa e notificaremos os responsáveis.

13. Transferência Internacional de Dados
13.1 Stripe (Estados Unidos):

Adequação: Standard Contractual Clauses (SCC) aprovadas pela União Europeia

Garantias: Stripe possui certificação ISO 27001 e PCI DSS Level 1

Finalidade: Processamento de pagamentos

13.2 Supabase:

Região: [Configurada para conformidade - ex: us-east-1 ou eu-west-1]

Garantias: Supabase possui conformidade GDPR e SOC 2 Type II

13.3 Direitos Garantidos: Mesmo em transferências internacionais, todos os seus direitos LGPD são mantidos.

14. Alterações nesta Política
14.1 Notificação: Alterações substanciais serão notificadas via email com 30 dias de antecedência.

14.2 Histórico: Versões anteriores disponíveis mediante solicitação ao DPO.

14.3 Aceitação: O uso continuado da Plataforma após alterações constitui aceitação.

14.4 Recusa: Se discordar das alterações, você pode excluir sua conta antes da vigência.

15. Autoridade Nacional de Proteção de Dados (ANPD)
15.1 Direito de Reclamação: Você tem o direito de apresentar reclamação à ANPD se considerar que seus direitos foram violados.

15.2 Contato ANPD:

Site: www.gov.br/anpd

Endereço: SIA, Trecho 1, Lote 620, Bloco E, Brasília/DF, CEP 71200-001

15.3 Resolução Interna: Recomendamos contatar nosso DPO primeiro para tentativa de resolução amigável.

16. Contato - Privacidade e Proteção de Dados
Encarregado de Proteção de Dados (DPO):
Email: dpo@kairos.app
Telefone: [A DEFINIR]

Para exercer direitos LGPD:

Exportação de dados: via Plataforma (Ajustes → Privacidade)

Correção de dados: via Plataforma (Ajustes → Dados Pessoais)

Exclusão de conta: via Plataforma (Ajustes → Privacidade)

Demais solicitações: contato direto com DPO

Prazo de Resposta: 15 dias úteis

Esta Política de Privacidade está em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018). Ao utilizar o KAIROS, você confirma ter lido, compreendido e concordado com esta Política.
        </CardContent>
      </Card>
    </div>
  );
}
