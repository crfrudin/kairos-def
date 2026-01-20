import type { SubjectTheoryDTO, StudyMode } from '../dtos/PlanTypes';
import type { DailyPlanItemDTO } from '../dtos/DailyPlanDTO';

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

    // teoria ocupa TODO o tempo restante (camada final)
    const theoryMinutes = remainingMinutes;

    // se não há tempo, ainda assim plano determinístico: teoria 0
    if (theoryMinutes <= 0) {
      return { theoryMinutes: 0, remainingMinutes, items: [] };
    }

    const active = subjects.filter((s) => s.isActive);
    const takeN = Math.min(subjectsPerDayLimit, active.length);

    if (takeN === 0) {
      // Sem matérias ativas: teoria existe como "tempo reservado", mas sem itens.
      // Mantém determinismo (e evidencia falta de cadastros via itens vazios).
      return { theoryMinutes, remainingMinutes: 0, items: [] };
    }

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

    const items: DailyPlanItemDTO[] = selected.map((s) => ({
      type: 'THEORY',
      title: `Teoria: ${s.name}`,
      minutes: 0, // tempo de teoria é global do bloco; distribuição por matéria é definida em domínio/etapas futuras (sem heurística aqui)
      metadata: { subjectId: s.id },
    }));

    return { theoryMinutes, remainingMinutes: 0, items, nextCycleCursor: nextCursor };
  }
}
