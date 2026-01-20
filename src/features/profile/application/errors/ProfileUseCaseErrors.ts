// src/features/profile/application/errors/ProfileUseCaseErrors.ts

import type { ValidationIssue } from '@/features/profile/domain/validation/ProfileContractValidation';

export class ProfileApplyConfirmationRequiredError extends Error {
  readonly name = 'ProfileApplyConfirmationRequiredError';
  constructor() {
    super('Confirmação explícita de aplicação é obrigatória (confirmApply=true).');
  }
}

export class ProfileValidationError extends Error {
  readonly name = 'ProfileValidationError';
  constructor(public readonly issues: ReadonlyArray<ValidationIssue>) {
    super('Falha de validação bloqueante do contrato de Perfil.');
  }
}
