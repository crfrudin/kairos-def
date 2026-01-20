// src/features/daily-plan/application/index.ts
// Public API (Application Layer) — paths reais e estáveis

// DTOs (contratos simples do motor)
export * from './dtos/PlanTypes';
export * from './dtos/DailyPlanDTO';

// Errors (Application)
export * from './errors/ExecutionAlreadyExistsError';
export * from './errors/InsufficientTimeError';
export * from './errors/InvalidInputError';
export * from './errors/PlanningBlockedError';
export * from './errors/PlanningError';
export * from './errors/RestDayError';

// Ports
export * from './ports/IPlanningContextPort';
export * from './ports/IDailyPlanPersistencePort';
export * from './ports/IDailyPlanReadPort';
export * from './ports/ICalendarProjectionPersistencePort';
export * from './ports/IExecutionPersistencePort';
export * from './ports/ISubjectsReader';

// Use-cases
export * from './use-cases/GenerateDailyPlan';
export * from './use-cases/GenerateCalendarProjection';
export * from './use-cases/RegenerateDailyPlan';
export * from './use-cases/GetDailyPlan';
export * from './use-cases/ExecuteDay';
