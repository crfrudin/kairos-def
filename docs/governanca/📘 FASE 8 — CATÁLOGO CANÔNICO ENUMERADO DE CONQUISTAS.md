# 📘 FASE 8 — CATÁLOGO CANÔNICO ENUMERADO DE CONQUISTAS
Projeto: KAIROS (kairos-def)

Origem normativa vinculante: **7. 📘 FASE 5 — GAMIFICAÇÃO.md** (ANEXO A: Catálogo de Conquistas V1)  
Status: **CONGELADO · IMUTÁVEL**  
Natureza: **Documento normativo conceitual (sem código)**

---

## 1) Princípios Normativos

Este catálogo:
- **deriva exclusivamente** do ANEXO A da FASE 5 (V1);
- **não cria** novas conquistas;
- **não contém** raridade, dificuldade, mérito, metas, níveis ou progressão;
- **não gera** efeitos técnicos nesta fase;
- define a **fonte conceitual oficial** de referência para exibição simbólica futura.

---

## 2) Estrutura Canônica

Para cada conquista:
- **achievement_slug** (identificador canônico)
- **nome simbólico**
- **descrição neutra**
- **categoria taxonômica**
- **evento(s) factual(is) associados** (descritos de forma conceitual e neutra)

> Observação: o “evento factual associado” aqui é descrito conceitualmente (ex.: “registro factual de meta diária concluída”), pois o ANEXO A define critérios em linguagem de domínio e não por enum técnico fechado.

---

## 3) Catálogo Enumerado (V1)

### 3.1 Categoria: Streak (sequência)

#### streak_3
- Nome simbólico: Sequência de 3 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 3 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída** (base de cálculo de sequência por dias consecutivos)

#### streak_7
- Nome simbólico: Sequência de 7 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 7 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### streak_30
- Nome simbólico: Sequência de 30 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 30 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### streak_100
- Nome simbólico: Sequência de 100 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 100 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### streak_365
- Nome simbólico: Sequência de 365 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 365 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### streak_1000
- Nome simbólico: Sequência de 1000 dias
- Descrição neutra: Concessão simbólica quando a sequência reconhecida de metas diárias concluídas atinge 1000 dias.
- Categoria taxonômica: streak
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

---

### 3.2 Categoria: Metas Diárias

#### goals_10
- Nome simbólico: 10 Metas
- Descrição neutra: Concessão simbólica quando o total reconhecido de metas diárias concluídas atinge 10.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída** (contabilização acumulada)

#### goals_50
- Nome simbólico: 50 Metas
- Descrição neutra: Concessão simbólica quando o total reconhecido de metas diárias concluídas atinge 50.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### goals_100
- Nome simbólico: 100 Metas
- Descrição neutra: Concessão simbólica quando o total reconhecido de metas diárias concluídas atinge 100.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### goals_500
- Nome simbólico: 500 Metas
- Descrição neutra: Concessão simbólica quando o total reconhecido de metas diárias concluídas atinge 500.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**

#### early_bird
- Nome simbólico: Madrugador
- Descrição neutra: Concessão simbólica quando a meta diária é concluída e o instante factual de conclusão ocorre antes de 12:00 no fuso do usuário.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída** com timestamp de conclusão

#### perfect_day
- Nome simbólico: Dia Perfeito
- Descrição neutra: Concessão simbólica quando a meta diária é concluída e todas as atividades extras previstas para o dia foram concluídas.
- Categoria taxonômica: metas
- Eventos factuais associados:
  - Registro factual de **meta diária concluída**
  - Registro factual de **execução de atividades extras** previstas no dia (cobertura total)

---

### 3.3 Categoria: Matérias

#### subjects_1
- Nome simbólico: Primeira Matéria
- Descrição neutra: Concessão simbólica quando o total reconhecido de matérias concluídas atinge 1.
- Categoria taxonômica: matérias
- Eventos factuais associados:
  - Registro factual de **conclusão de matéria** (contabilização acumulada)

#### subjects_5
- Nome simbólico: 5 Matérias
- Descrição neutra: Concessão simbólica quando o total reconhecido de matérias concluídas atinge 5.
- Categoria taxonômica: matérias
- Eventos factuais associados:
  - Registro factual de **conclusão de matéria**

#### subjects_10
- Nome simbólico: 10 Matérias
- Descrição neutra: Concessão simbólica quando o total reconhecido de matérias concluídas atinge 10.
- Categoria taxonômica: matérias
- Eventos factuais associados:
  - Registro factual de **conclusão de matéria**

#### subjects_25
- Nome simbólico: 25 Matérias
- Descrição neutra: Concessão simbólica quando o total reconhecido de matérias concluídas atinge 25.
- Categoria taxonômica: matérias
- Eventos factuais associados:
  - Registro factual de **conclusão de matéria**

---

### 3.4 Categoria: Questões

#### questions_100
- Nome simbólico: 100 Questões
- Descrição neutra: Concessão simbólica quando o total reconhecido de questões resolvidas atinge 100.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas** (contabilização acumulada)

#### questions_1000
- Nome simbólico: 1.000 Questões
- Descrição neutra: Concessão simbólica quando o total reconhecido de questões resolvidas atinge 1000.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas**

#### questions_5000
- Nome simbólico: 5.000 Questões
- Descrição neutra: Concessão simbólica quando o total reconhecido de questões resolvidas atinge 5000.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas**

#### questions_10000
- Nome simbólico: 10.000 Questões
- Descrição neutra: Concessão simbólica quando o total reconhecido de questões resolvidas atinge 10000.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas**

#### accuracy_70
- Nome simbólico: Precisão 70%
- Descrição neutra: Concessão simbólica quando a taxa de acerto acumulada atinge ao menos 70%, respeitando o mínimo de base factual indicado.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas** com campos de acertos/total (base mínima: 100 questões)

#### accuracy_80
- Nome simbólico: Precisão 80%
- Descrição neutra: Concessão simbólica quando a taxa de acerto acumulada atinge ao menos 80%, respeitando o mínimo de base factual indicado.
- Categoria taxonômica: questões
- Eventos factuais associados:
  - Registro factual de **questões resolvidas** com campos de acertos/total (base mínima: 500 questões)

---

### 3.5 Categoria: Informativos

#### infs_10
- Nome simbólico: 10 Informativos
- Descrição neutra: Concessão simbólica quando o total reconhecido de informativos lidos atinge 10.
- Categoria taxonômica: informativos
- Eventos factuais associados:
  - Registro factual de **informativo lido** (contabilização acumulada)

#### infs_50
- Nome simbólico: 50 Informativos
- Descrição neutra: Concessão simbólica quando o total reconhecido de informativos lidos atinge 50.
- Categoria taxonômica: informativos
- Eventos factuais associados:
  - Registro factual de **informativo lido**

#### infs_on_time_30d
- Nome simbólico: Em Dia por 30 Dias
- Descrição neutra: Concessão simbólica quando, por 30 dias consecutivos, os registros factuais indicam ausência de defasagem entre o último informativo disponível e o último informativo lido.
- Categoria taxonômica: informativos
- Eventos factuais associados:
  - Registro factual de **informativo lido**
  - Registro factual/estado de **disponibilidade de informativos** (para comparação “último disponível” vs “último lido”)

---

### 3.6 Categoria: Lei Seca

#### law_100
- Nome simbólico: 100 Artigos
- Descrição neutra: Concessão simbólica quando o total reconhecido de artigos de lei seca lidos atinge 100.
- Categoria taxonômica: lei seca
- Eventos factuais associados:
  - Registro factual de **artigo de lei seca lido** (contabilização acumulada)

#### law_500
- Nome simbólico: 500 Artigos
- Descrição neutra: Concessão simbólica quando o total reconhecido de artigos de lei seca lidos atinge 500.
- Categoria taxonômica: lei seca
- Eventos factuais associados:
  - Registro factual de **artigo de lei seca lido**

#### law_1000
- Nome simbólico: 1.000 Artigos
- Descrição neutra: Concessão simbólica quando o total reconhecido de artigos de lei seca lidos atinge 1000.
- Categoria taxonômica: lei seca
- Eventos factuais associados:
  - Registro factual de **artigo de lei seca lido**

#### law_complete_1
- Nome simbólico: Lei Completa
- Descrição neutra: Concessão simbólica quando uma lei é concluída integralmente (todos os artigos), conforme registros factuais de leitura.
- Categoria taxonômica: lei seca
- Eventos factuais associados:
  - Registro factual de **artigo de lei seca lido** com agregação por lei (100% dos artigos)

---

### 3.7 Categoria: Ocultas (Hidden)

#### hidden_after_midnight
- Nome simbólico: Coruja
- Descrição neutra: Concessão simbólica quando há registro factual de progresso entre 00:00 e 06:00 (fuso do usuário).
- Categoria taxonômica: ocultas
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** com timestamp dentro da janela 00:00–06:00

#### hidden_before_6am
- Nome simbólico: Madrugador Real
- Descrição neutra: Concessão simbólica quando há registro factual de progresso entre 04:00 e 06:00 (fuso do usuário).
- Categoria taxonômica: ocultas
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** com timestamp dentro da janela 04:00–06:00

#### hidden_holiday
- Nome simbólico: Feriado Produtivo
- Descrição neutra: Concessão simbólica quando há registro factual de progresso em data classificada como feriado nacional no sistema.
- Categoria taxonômica: ocultas
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** em data marcada como feriado no sistema

#### hidden_24_12
- Nome simbólico: Véspera de Natal
- Descrição neutra: Concessão simbólica quando há registro factual de progresso no dia 24/12.
- Categoria taxonômica: ocultas
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** na data 24/12

#### hidden_31_12
- Nome simbólico: Réveillon
- Descrição neutra: Concessão simbólica quando há registro factual de progresso no dia 31/12.
- Categoria taxonômica: ocultas
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** na data 31/12

---

### 3.8 Categoria: Sazonais

#### seasonal_new_year
- Nome simbólico: Começo de Ano
- Descrição neutra: Concessão simbólica quando há registro factual de progresso no dia 01/01.
- Categoria taxonômica: sazonais
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** na data 01/01

#### seasonal_christmas
- Nome simbólico: Natal
- Descrição neutra: Concessão simbólica quando há registro factual de progresso no dia 25/12.
- Categoria taxonômica: sazonais
- Eventos factuais associados:
  - Registro factual de **progresso de estudo** na data 25/12

---

## 4) Regra de Alteração

Este catálogo é **imutável**.
Qualquer alteração exige:
- abertura de nova fase de governança;
- deliberação formal;
- novo congelamento.

