// Public API da feature auth (o que outras partes do app podem importar)

// Domain
export type { AuthUser, AuthUserId } from './domain/entities/AuthUser';
export type { Email } from './domain/value-objects/Email';
export type { Password, PasswordErrorCode } from './domain/value-objects/Password';

// Application (ports + result)
export type { Result, AuthErrorCode, IAuthRepository } from './application/ports/IAuthRepository';

// Use-cases (públicos)
export { SignUpUseCase } from './application/use-cases/SignUpUseCase';
export { LoginUseCase } from './application/use-cases/LoginUseCase';
export { ConfirmEmailUseCase } from './application/use-cases/ConfirmEmailUseCase';
export { RequestPasswordResetUseCase } from './application/use-cases/RequestPasswordResetUseCase';
export { ResetPasswordUseCase } from './application/use-cases/ResetPasswordUseCase';
