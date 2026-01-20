// src/features/daily-plan/application/index.ts

// DTOS (V2)
export * from './dtos/PlanTypes';
export * from './dtos/DailyPlanDTO';

// PORTS (V2)
export * from './ports/IPlanningContextPort';
export * from './ports/IDailyPlanPersistencePort';
export * from './ports/ISubjectsReader';

// USE-CASES (V2)
export * from './use-cases/GenerateDailyPlan';

// SERVICES (V2) — opcionais para composição externa
export * from './services/DailyPlanComposer';
export * from './services/RestDayEvaluator';
export * from './services/ReviewAllocator';
export * from './services/ExtrasAllocator';
export * from './services/TheoryAllocator';
