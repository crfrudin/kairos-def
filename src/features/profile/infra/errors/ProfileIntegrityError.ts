// src/features/profile/infra/errors/ProfileIntegrityError.ts

export class ProfileIntegrityError extends Error {
  readonly name = 'ProfileIntegrityError';

  constructor(message: string) {
    super(message);
  }
}
