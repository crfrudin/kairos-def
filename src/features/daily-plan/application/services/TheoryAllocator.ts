import type { SubjectTheoryDTO, StudyMode } from '../dtos/PlanTypes';
import type { DailyPlanItemDTO } from '../dtos/DailyPlanDTO';

function assertNonEmptyActiveSubjects(subjects: SubjectTheoryDTO[]): SubjectTheoryDTO[] {
  return subjects.filter((s) => s.isActive);
}

export class TheoryAllocator {
  public allocate(params: {
    date: string;
    studyMode: StudyMode;
    subjectsPerDayLimit: number;
    weekdayHasTheory: boolean;
    remainingMinutes: number;

    subjects: SubjectTheoryDTO[];

    // apenas CICLO
    cycleCursor?: number;
  }): { theoryMinutes: number; remainingMinutes: number; items: DailyPlanItemDTO[]; nextCycleCursor?: number } {
    const {
      remainingMinutes,
      weekdayHasTheory,
      subjectsPerDayLimit,
      studyMode,
      subjects,
      cycleCursor,
    } = params;

    if (!weekdayHasTheory) {
      return { theoryMinutes: 0, remainingMinutes, items: [] };
    }

    // Teoria ocupa TODO o tempo restante (camada final)
    const theoryMinutes = remainingMinutes;

    if (theoryMinutes <= 0) {
      return { theoryMinutes: 0, remainingMinutes, items: [] };
    }

    const active = assertNonEmptyActiveSubjects(subjects);

    if (active.length === 0) {
      // Sem matérias ativas: tempo de teoria existe, mas não há itens.
      // Determinístico e auditável.
      return { theoryMinutes, remainingMinutes: 0, items: [] };
    }

    // Limite normativo: subjectsPerDayLimit conta apenas teoria.
    // Além disso, não é permitido gerar item com 0 minutos (DDL + validação persistence).
    // Logo, o número de itens de teoria não pode exceder theoryMinutes.
    const maxItemsByMinutes = Math.max(1, Math.min(theoryMinutes, 1440));
    const takeN = Math.min(subjectsPerDayLimit, active.length, maxItemsByMinutes);

    let selected: SubjectTheoryDTO[] = [];
    let nextCursor: number | undefined;

    if (studyMode === 'FIXO') {
      selected = active.slice(0, takeN);
    } else {
      const start = typeof cycleCursor === 'number' ? cycleCursor : 0;
      selected = [];

      for (let i = 0; i < takeN; i++) {
        const idx = (start + i) % active.length;
        selected.push(active[idx]);
      }

      nextCursor = (start + takeN) % active.length;
    }

    // Distribuição determinística de minutos entre matérias selecionadas.
    // base + 1 para os primeiros "rest" itens.
    const base = Math.floor(theoryMinutes / selected.length);
    const rest = theoryMinutes % selected.length;

    const items: DailyPlanItemDTO[] = selected.map((s, idx) => {
      const minutes = base + (idx < rest ? 1 : 0);

      // Por construção, minutes >= 1 (pois selected.length <= theoryMinutes).
      return {
        type: 'THEORY',
        title: `Teoria: ${s.name}`,
        minutes,
        metadata: { subjectId: s.id },
      };
    });

    return { theoryMinutes, remainingMinutes: 0, items, nextCycleCursor: nextCursor };
  }
}
