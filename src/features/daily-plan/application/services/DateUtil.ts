import { InvalidInputError } from '../errors/InvalidInputError';

export const assertIsoDate = (date: string): void => {
  // Aceita somente YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InvalidInputError({ message: 'Formato de data inválido. Use YYYY-MM-DD.', field: 'date' });
  }
};

export const weekdayFromIsoDate = (date: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 => {
  assertIsoDate(date);

  // Interpretar como UTC para evitar variação por timezone local:
  // new Date('YYYY-MM-DD') vira UTC midnight em JS engines modernas.
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new InvalidInputError({ message: 'Data inválida.', field: 'date' });
  }

  // JS: 0=Dom..6=Sáb
  const js = d.getUTCDay();

  // Converter para 1=Seg..7=Dom
  // js 0(Dom) -> 7
  // js 1(Seg) -> 1
  // ...
  const map: Record<number, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
    0: 7,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
  };
  return map[js];
};

export const isDateInRangeInclusive = (date: string, start: string, end: string): boolean => {
  assertIsoDate(date);
  assertIsoDate(start);
  assertIsoDate(end);
  return date >= start && date <= end; // válido para YYYY-MM-DD lexicográfico
};
