import { DomainError } from "../_shared/DomainError";
import { normalizeTrim } from "../_shared/normalize";

export class SubscriptionDate {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(raw: string): SubscriptionDate {
    const v = normalizeTrim(raw);

    // YYYY-MM-DD (sem Date, sem timezone, sem "now")
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) {
      throw new DomainError(
        "InvalidSubscriptionDate",
        "SubscriptionDate deve estar no formato YYYY-MM-DD."
      );
    }

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);

    if (year < 2000 || year > 2100) {
      throw new DomainError("InvalidSubscriptionDate", "Ano fora do intervalo permitido.");
    }
    if (month < 1 || month > 12) {
      throw new DomainError("InvalidSubscriptionDate", "Mês inválido.");
    }
    const maxDay = daysInMonth(year, month);
    if (day < 1 || day > maxDay) {
      throw new DomainError("InvalidSubscriptionDate", "Dia inválido.");
    }

    return new SubscriptionDate(v);
  }

  public get value(): string {
    return this._value;
  }

  // comparação lexicográfica funciona em YYYY-MM-DD
  public isBefore(other: SubscriptionDate): boolean {
    return this._value < other._value;
  }

  public isAfter(other: SubscriptionDate): boolean {
    return this._value > other._value;
  }

  public equals(other: SubscriptionDate): boolean {
    return this._value === other._value;
  }
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}
