import type { CalendarProjectionPayload } from '../ports/ICalendarProjectionPersistencePort';
import type { ICalendarProjectionReadPort } from '../ports/ICalendarProjectionReadPort';
import { assertIsoDate } from '../services/DateUtil';
import { InvalidInputError } from '../errors/InvalidInputError';

export interface GetCalendarProjectionInput {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
}

export interface GetCalendarProjectionOutput {
  projection: CalendarProjectionPayload | null;
}

export interface GetCalendarProjectionDeps {
  readPort: ICalendarProjectionReadPort;
}

function assertRangeOrderAndLimit(rangeStart: string, rangeEnd: string): void {
  // ISO date lexical order == chronological order
  if (rangeStart > rangeEnd) {
    throw new InvalidInputError({ message: 'rangeStart deve ser <= rangeEnd.', field: 'rangeStart' });
  }

  // Limite defensivo alinhado ao DDL (<= 90 dias de diferença)
  const start = new Date(`${rangeStart}T00:00:00.000Z`);
  const end = new Date(`${rangeEnd}T00:00:00.000Z`);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);

  if (!Number.isFinite(diffDays) || diffDays < 0) {
    throw new InvalidInputError({ message: 'Intervalo inválido.', field: 'rangeStart' });
  }
  if (diffDays > 90) {
    throw new InvalidInputError({ message: 'Intervalo máximo é 90 dias (inclusive).', field: 'rangeEnd' });
  }
}

export class GetCalendarProjectionUseCase {
  constructor(private readonly deps: GetCalendarProjectionDeps) {}

  public async execute(input: GetCalendarProjectionInput): Promise<GetCalendarProjectionOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.rangeStart);
    assertIsoDate(input.rangeEnd);
    assertRangeOrderAndLimit(input.rangeStart, input.rangeEnd);

    const projection = await this.deps.readPort.getCalendarProjection({
      userId: input.userId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
    });

    return { projection };
  }
}
