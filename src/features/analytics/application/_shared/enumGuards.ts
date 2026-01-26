export const isEnumValue = <T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] => {
  if (typeof value !== 'string') return false;
  return Object.values(enumObj).includes(value);
};
