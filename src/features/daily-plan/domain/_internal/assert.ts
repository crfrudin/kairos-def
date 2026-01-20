import { DomainError } from '../errors/DomainError';

export function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

export function unreachable(x: never): never {
  throw new DomainError('UNREACHABLE', `Unreachable case: ${String(x)}`);
}
