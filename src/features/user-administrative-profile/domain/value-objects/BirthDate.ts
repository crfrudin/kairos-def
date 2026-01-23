import { DomainValidationError } from "../_shared/DomainValidationError";
import { trimToNull } from "../_shared/normalize";

/**
 * VO conceitual: data de nascimento.
 * Proibição: NÃO usar Date real.
 * Representação: string normalizada YYYY-MM-DD.
 */
export class BirthDate {
  private readonly _value: string; // YYYY-MM-DD

  private constructor(value: string) {
    this._value = value;
  }

  public static create(input: string | null | undefined): BirthDate | null {
    const raw = trimToNull(input);
    if (!raw) return null;

    const v = raw;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new DomainValidationError("BIRTH_DATE_INVALID_FORMAT", "Birth date must be in YYYY-MM-DD format.");
    }

    const [yStr, mStr, dStr] = v.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);

    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      throw new DomainValidationError("BIRTH_DATE_INVALID_YEAR", "Birth date year is invalid.");
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new DomainValidationError("BIRTH_DATE_INVALID_MONTH", "Birth date month is invalid.");
    }
    const maxDay = daysInMonth(y, m);
    if (!Number.isInteger(d) || d < 1 || d > maxDay) {
      throw new DomainValidationError("BIRTH_DATE_INVALID_DAY", "Birth date day is invalid.");
    }

    return new BirthDate(`${yStr}-${mStr}-${dStr}`);
  }

  public get value(): string {
    return this._value;
  }
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: return 31;
    case 2: return isLeapYear(year) ? 29 : 28;
    case 3: return 31;
    case 4: return 30;
    case 5: return 31;
    case 6: return 30;
    case 7: return 31;
    case 8: return 31;
    case 9: return 30;
    case 10: return 31;
    case 11: return 30;
    case 12: return 31;
    default: return 0;
  }
}
