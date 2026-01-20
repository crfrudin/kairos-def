// Public API da feature auth (o que outras partes do app podem importar)

export type { AuthUser, AuthUserId } from './domain/entities/AuthUser';
export type { Email } from './domain/value-objects/Email';
export type { Password } from './domain/value-objects/Password';

export type { Result, AuthErrorCode, IAuthRepository } from './application/ports/IAuthRepository';
