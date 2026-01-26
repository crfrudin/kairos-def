const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return ISO_DATE_REGEX.test(value);
};
