import { describe, it, expect } from 'vitest';
import { validateProfileContract } from '../ProfileContractValidation';
import type {
  ProfileContract,
  ProfileWeekdayRuleRow,
  ProfileRestPeriodRow,
} from '@/features/profile/application/ports/ProfileContract';

function makeWeekdayRules(params?: Partial<ProfileWeekdayRuleRow>): ProfileWeekdayRuleRow[] {
  const base: Omit<ProfileWeekdayRuleRow, 'weekday'> = {
    userId: 'user-a',
    dailyMinutes: 120,
    hasTheory: true,
    hasQuestions: false,
    hasInformatives: false,
    hasLeiSeca: false,
    createdAt: '2026-01-19T00:00:00.000Z',
    updatedAt: '2026-01-19T00:00:00.000Z',
    ...params,
  };

  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    ...base,
    ...(params ?? {}),
  }));
}

function makeValidContract(overrides?: Partial<ProfileContract>): ProfileContract {
  const contract: ProfileContract = {
    rules: {
      userId: 'user-a',
      subjectsPerDayLimit: 3,
      studyMode: 'FIXO',
      createdAt: '2026-01-19T00:00:00.000Z',
      updatedAt: '2026-01-19T00:00:00.000Z',
    },
    weekdayRules: makeWeekdayRules(),
    extrasDurations: {
      userId: 'user-a',
      questionsMinutes: 30,
      informativesMinutes: 30,
      leiSecaMinutes: 30,
      createdAt: '2026-01-19T00:00:00.000Z',
      updatedAt: '2026-01-19T00:00:00.000Z',
    },
    autoReviewPolicy: {
      userId: 'user-a',
      enabled: false,
      frequencyDays: null,
      reviewMinutes: null,
      reserveTimeBlock: false,
      createdAt: '2026-01-19T00:00:00.000Z',
      updatedAt: '2026-01-19T00:00:00.000Z',
    },
    restPeriods: [],
  };

  return {
    ...contract,
    ...overrides,
  };
}

function codes(result: ReturnType<typeof validateProfileContract>) {
  return result.blocking.map((x) => x.code);
}

describe('ProfileContractValidation.validateProfileContract', () => {
  it('aceita contrato válido (sem issues bloqueantes)', () => {
    const contract = makeValidContract();
    const res = validateProfileContract(contract, '2026-01-19');
    expect(res.blocking).toHaveLength(0);
  });

  it('bloqueia USER_ID_MISMATCH quando userId difere entre partes', () => {
    const contract = makeValidContract({
      extrasDurations: {
        ...makeValidContract().extrasDurations,
        userId: 'user-b',
      },
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('USER_ID_MISMATCH');
    expect(res.blocking.some((x) => x.path === 'extrasDurations.userId')).toBe(true);
  });

  it('bloqueia SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE (<1)', () => {
    const contract = makeValidContract({
      rules: { ...makeValidContract().rules, subjectsPerDayLimit: 0 },
    });
    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE');
    expect(res.blocking.some((x) => x.path === 'rules.subjectsPerDayLimit')).toBe(true);
  });

  it('bloqueia SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE (>9)', () => {
    const contract = makeValidContract({
      rules: { ...makeValidContract().rules, subjectsPerDayLimit: 10 },
    });
    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('SUBJECTS_PER_DAY_LIMIT_OUT_OF_RANGE');
  });

  it('bloqueia STUDY_MODE_INVALID (valor fora de FIXO/CICLO)', () => {
    const contract = makeValidContract({
      rules: { ...makeValidContract().rules, studyMode: 'OUTRO' as any },
    });
    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('STUDY_MODE_INVALID');
    expect(res.blocking.some((x) => x.path === 'rules.studyMode')).toBe(true);
  });

  it('bloqueia WEEKDAY_RULES_NOT_COMPLETE quando weekdayRules != 7 itens', () => {
    const base = makeValidContract();
    const contract = makeValidContract({
      weekdayRules: base.weekdayRules.slice(0, 6),
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('WEEKDAY_RULES_NOT_COMPLETE');
  });

  it('bloqueia WEEKDAY_RULES_DUPLICATED quando há weekday duplicado', () => {
    const base = makeValidContract();
    const dup = [...base.weekdayRules];
    dup[6] = { ...dup[0]!, weekday: 1 }; // duplica

    const res = validateProfileContract(
      makeValidContract({ weekdayRules: dup }),
      '2026-01-19'
    );
    expect(codes(res)).toContain('WEEKDAY_RULES_DUPLICATED');
  });

  it('bloqueia WEEKDAY_OUT_OF_RANGE quando weekday fora de 1..7', () => {
    const base = makeValidContract();
    const bad = [...base.weekdayRules];
    bad[0] = { ...bad[0]!, weekday: 0 };

    const res = validateProfileContract(makeValidContract({ weekdayRules: bad }), '2026-01-19');
    expect(codes(res)).toContain('WEEKDAY_OUT_OF_RANGE');
    expect(res.blocking.some((x) => x.path === 'weekdayRules[0].weekday')).toBe(true);
  });

  it('bloqueia DAILY_MINUTES_OUT_OF_RANGE quando dailyMinutes fora 0..1440', () => {
    const base = makeValidContract();
    const bad = [...base.weekdayRules];
    bad[0] = { ...bad[0]!, dailyMinutes: -1 };

    const res = validateProfileContract(makeValidContract({ weekdayRules: bad }), '2026-01-19');
    expect(codes(res)).toContain('DAILY_MINUTES_OUT_OF_RANGE');
    expect(res.blocking.some((x) => x.path === 'weekdayRules[0].dailyMinutes')).toBe(true);
  });

  it('bloqueia DAY_WITH_MINUTES_ZERO_HAS_TYPES quando dailyMinutes=0 e há tipos', () => {
    const base = makeValidContract();
    const bad = [...base.weekdayRules];
    bad[2] = { ...bad[2]!, dailyMinutes: 0, hasTheory: true }; // tipos ativos com 0

    const res = validateProfileContract(makeValidContract({ weekdayRules: bad }), '2026-01-19');
    expect(codes(res)).toContain('DAY_WITH_MINUTES_ZERO_HAS_TYPES');
    expect(res.blocking.some((x) => x.path === 'weekdayRules[2]')).toBe(true);
  });

  it('bloqueia DAY_WITH_MINUTES_POSITIVE_HAS_NO_TYPES quando dailyMinutes>0 e nenhum tipo', () => {
    const base = makeValidContract();
    const bad = [...base.weekdayRules];
    bad[3] = {
      ...bad[3]!,
      dailyMinutes: 60,
      hasTheory: false,
      hasQuestions: false,
      hasInformatives: false,
      hasLeiSeca: false,
    };

    const res = validateProfileContract(makeValidContract({ weekdayRules: bad }), '2026-01-19');
    expect(codes(res)).toContain('DAY_WITH_MINUTES_POSITIVE_HAS_NO_TYPES');
    expect(res.blocking.some((x) => x.path === 'weekdayRules[3]')).toBe(true);
  });

  it('bloqueia AUTO_REVIEW_ENABLED_MISSING_FIELDS quando enabled=true sem campos obrigatórios', () => {
    const contract = makeValidContract({
      autoReviewPolicy: {
        ...makeValidContract().autoReviewPolicy,
        enabled: true,
        frequencyDays: null,
        reviewMinutes: null,
      },
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('AUTO_REVIEW_ENABLED_MISSING_FIELDS');
  });

  it('bloqueia AUTO_REVIEW_DISABLED_HAS_FIELDS quando enabled=false mas campos preenchidos', () => {
    const contract = makeValidContract({
      autoReviewPolicy: {
        ...makeValidContract().autoReviewPolicy,
        enabled: false,
        frequencyDays: 7,
        reviewMinutes: 30,
      },
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('AUTO_REVIEW_DISABLED_HAS_FIELDS');
  });

  it('emite informativa AUTO_REVIEW_REVIEW_MINUTES_INVALID quando enabled=true e não existe dia com teoria ativa', () => {
    const contract = makeValidContract({
      weekdayRules: makeWeekdayRules({
  hasTheory: false,
  hasQuestions: true, // garante pelo menos 1 tipo ativo
  dailyMinutes: 120,
}),
      autoReviewPolicy: {
        ...makeValidContract().autoReviewPolicy,
        enabled: true,
        frequencyDays: 7,
        reviewMinutes: 30,
        reserveTimeBlock: true,
      },
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(res.blocking).toHaveLength(0);
    expect(res.informative.map((x) => x.code)).toContain('AUTO_REVIEW_REVIEW_MINUTES_INVALID');
  });

  it('bloqueia FIXED_TIME_EXCEEDS_TOTAL_TIME quando extras (+ revisão reservada, se aplicável) excede dailyMinutes', () => {
    const base = makeValidContract();

    // Dia com teoria ativa e pouco tempo
    const weekdayRules = [...base.weekdayRules];
    weekdayRules[0] = { ...weekdayRules[0]!, dailyMinutes: 30, hasTheory: true, hasQuestions: true };

    // extras.questionsMinutes = 60 -> excede 30
    const contract = makeValidContract({
      weekdayRules,
      extrasDurations: { ...base.extrasDurations, questionsMinutes: 60 },
      autoReviewPolicy: {
        ...base.autoReviewPolicy,
        enabled: false,
      },
    });

    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('FIXED_TIME_EXCEEDS_TOTAL_TIME');
    expect(res.blocking.some((x) => x.path === 'weekdayRules[0]')).toBe(true);
  });

  it('considera revisão reservada SOMENTE quando enabled && reserveTimeBlock && hasTheory', () => {
    const base = makeValidContract();

    // dailyMinutes=50, extras (questions=30), review=30. Se contar review => 60>50 (bloqueia)
    const weekdayRules = [...base.weekdayRules];
    weekdayRules[0] = { ...weekdayRules[0]!, dailyMinutes: 50, hasTheory: true, hasQuestions: true };

    const contractShouldBlock = makeValidContract({
      weekdayRules,
      extrasDurations: { ...base.extrasDurations, questionsMinutes: 30 },
      autoReviewPolicy: {
        ...base.autoReviewPolicy,
        enabled: true,
        reserveTimeBlock: true,
        frequencyDays: 7,
        reviewMinutes: 30,
      },
    });

    const res1 = validateProfileContract(contractShouldBlock, '2026-01-19');
    expect(codes(res1)).toContain('FIXED_TIME_EXCEEDS_TOTAL_TIME');

    // Mesmo cenário, mas sem teoria -> review não conta -> 30 <= 50 (não bloqueia)
    const weekdayRulesNoTheory = [...weekdayRules];
    weekdayRulesNoTheory[0] = { ...weekdayRulesNoTheory[0]!, hasTheory: false, hasQuestions: true };

    const contractShouldPass = makeValidContract({
      weekdayRules: weekdayRulesNoTheory,
      extrasDurations: { ...base.extrasDurations, questionsMinutes: 30 },
      autoReviewPolicy: {
        ...base.autoReviewPolicy,
        enabled: true,
        reserveTimeBlock: true,
        frequencyDays: 7,
        reviewMinutes: 30,
      },
    });

    const res2 = validateProfileContract(contractShouldPass, '2026-01-19');
    expect(res2.blocking).toHaveLength(0);
  });

  it('bloqueia REST_PERIOD_RANGE_INVALID quando startDate > endDate', () => {
    const rp: ProfileRestPeriodRow = {
      id: 'rp-1',
      userId: 'user-a',
      startDate: '2026-02-10',
      endDate: '2026-02-01',
      createdAt: '2026-01-19T00:00:00.000Z',
    };

    const contract = makeValidContract({ restPeriods: [rp] });
    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('REST_PERIOD_RANGE_INVALID');
    expect(res.blocking.some((x) => x.path === 'restPeriods[0]')).toBe(true);
  });

  it('bloqueia REST_PERIOD_IN_PAST quando startDate < today', () => {
    const rp: ProfileRestPeriodRow = {
      id: 'rp-1',
      userId: 'user-a',
      startDate: '2026-01-18',
      endDate: '2026-01-18',
      createdAt: '2026-01-19T00:00:00.000Z',
    };

    const contract = makeValidContract({ restPeriods: [rp] });
    const res = validateProfileContract(contract, '2026-01-19');
    expect(codes(res)).toContain('REST_PERIOD_IN_PAST');
    expect(res.blocking.some((x) => x.path === 'restPeriods[0].startDate')).toBe(true);
  });
});
