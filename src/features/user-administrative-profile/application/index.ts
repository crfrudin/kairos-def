// src/features/user-administrative-profile/application/index.ts
// Public API (Application Layer) — paths reais e estáveis

// DTOs
export * from './dtos/UserAdministrativeProfileDTO';
export * from './dtos/UpsertUserAdministrativeProfileDTO';
export * from './dtos/UserAdministrativeProfileCompletenessDTO';

// Errors
export * from './errors/UserAdministrativeProfileErrors';

// Ports
export * from './ports/Result';
export * from './ports/IAuthIdentityReader';
export * from './ports/UserAdministrativeProfileContract';
export * from './ports/IUserAdministrativeProfileRepository';
export * from './ports/IUserAdministrativeProfileTransaction';

// Use-cases
export * from './use-cases/GetUserAdministrativeProfileUseCase';
export * from './use-cases/UpsertUserAdministrativeProfileUseCase';
export * from './use-cases/CheckUserAdministrativeProfileCompletenessUseCase';
