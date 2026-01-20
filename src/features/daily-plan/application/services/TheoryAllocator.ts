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

    if (theoryMinutes <= 0) {
      return { theoryMinutes: 0, remainingMinutes, items: [] };
    }

    const active = subjects.filter((s) => s.isActive);

    // Limite teórico por dia (normativo), mas:
    // DB exige planned_minutes >= 1 por item.
    // Portanto, não podemos criar mais itens do que theoryMinutes.
    const maxItemsByTime = Math.max(0, Math.floor(theoryMinutes)); // minutos inteiros
    const takeN = Math.min(subjectsPerDayLimit, active.length, maxItemsByTime);

    if (takeN === 0) {
      // Sem matérias ativas OU sem minutos suficientes para materializar itens (>=1 por item).
      // Teoria ainda "consome" o bloco do dia (theoryMinutes), mas sem itens materializados.
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

    // Distribuição determinística:
    // - base = floor(theoryMinutes / takeN)
    // - resto = theoryMinutes % takeN
    // - primeiros "resto" recebem +1 minuto
    // Garante planned_minutes >= 1 (pois takeN <= theoryMinutes e base >= 1 quando takeN <= theoryMinutes).
    const base = Math.floor(theoryMinutes / takeN);
    const rest = theoryMinutes % takeN;

    const items: DailyPlanItemDTO[] = selected.map((s, idx) => {
      const minutes = base + (idx < rest ? 1 : 0);

      // Defesa: DB exige 1..1440
      if (minutes < 1 || minutes > 1440) {
        throw new Error(`THEORY_ALLOCATION_INVALID_MINUTES: minutes=${minutes} subject=${s.id}`);
      }

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
