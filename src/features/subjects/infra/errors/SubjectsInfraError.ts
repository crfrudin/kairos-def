// src/features/subjects/infra/errors/SubjectsInfraError.ts

export class SubjectsInfraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubjectsInfraError';
  }
}
