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
  }): {
    theoryMinutes: number;
    remainingMinutes: number;
    items: DailyPlanItemDTO[];
    nextCycleCursor?: number;
  } {
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

    // se não há tempo, ainda assim plano determinístico
    if (theoryMinutes <= 0) {
      return { theoryMinutes: 0, remainingMinutes, items: [] };
    }

    const active = subjects.filter((s) => s.isActive);
    const takeN = Math.min(subjectsPerDayLimit, active.length);

    if (takeN === 0) {
      // Sem matérias ativas: teoria existe como "tempo reservado", mas sem itens.
      return { theoryMinutes, remainingMinutes: 0, items: [] };
    }

    let selected: SubjectTheoryDTO[] = [];
    let nextCursor: number | undefined;

    if (studyMode === 'FIXO') {
      selected = active.slice(0, takeN);
    } else {
      const start = typeof cycleCursor === 'number' ? cycleCursor : 0;

      for (let i = 0; i < takeN; i++) {
        const idx = (start + i) % active.length;
        selected.push(active[idx]);
      }

      nextCursor = (start + takeN) % active.length;
    }

    /**
     * DISTRIBUIÇÃO DETERMINÍSTICA (sem heurística):
     * - Divide theoryMinutes entre as matérias selecionadas
     * - Parte inteira para todas
     * - Resto (+1) nos primeiros `remainder` itens
     *
     * Observação: DDL exige planned_minutes >= 1 quando existir item.
     */
    const base = Math.floor(theoryMinutes / selected.length);
    const remainder = theoryMinutes % selected.length;

    const minutesByIndex = selected.map((_, idx) => base + (idx < remainder ? 1 : 0));

    // Garantia defensiva: se theoryMinutes>0, cada item deve ter >=1
    // Isso só falharia se selected.length > theoryMinutes (ex.: 3 matérias, 2 minutos).
    // Nesse caso, reduz deterministicamente para `theoryMinutes` matérias (1 min cada).
    let finalSelected = selected;
    let finalMinutes = minutesByIndex;

    if (finalSelected.length > theoryMinutes) {
      finalSelected = selected.slice(0, theoryMinutes);
      finalMinutes = Array.from({ length: theoryMinutes }, () => 1);
      nextCursor = studyMode === 'CICLO'
        ? ((typeof cycleCursor === 'number' ? cycleCursor : 0) + finalSelected.length) % active.length
        : undefined;
    }

    const items: DailyPlanItemDTO[] = finalSelected.map((s, idx) => ({
      type: 'THEORY',
      title: `Teoria: ${s.name}`,
      minutes: finalMinutes[idx],
      metadata: { subjectId: s.id },
    }));

    return {
      theoryMinutes,
      remainingMinutes: 0,
      items,
      nextCycleCursor: nextCursor,
    };
  }
}
