import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';
import type { IDailyPlanReadPort } from '../ports/IDailyPlanReadPort';
import { assertIsoDate } from '../services/DateUtil';
import { InvalidInputError } from '../errors/InvalidInputError';

export interface GetDailyPlanInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface GetDailyPlanOutput {
  plan: DailyPlanDTO | null;
}

export interface GetDailyPlanDeps {
  readPort: IDailyPlanReadPort;
}

export class GetDailyPlanUseCase {
  constructor(private readonly deps: GetDailyPlanDeps) {}

  public async execute(input: GetDailyPlanInput): Promise<GetDailyPlanOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }
    assertIsoDate(input.date);

    const plan = await this.deps.readPort.getDailyPlan({ userId: input.userId, date: input.date });
    return { plan };
  }
}
