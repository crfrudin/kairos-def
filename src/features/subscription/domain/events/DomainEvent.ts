export type DomainEvent<TType extends string, TPayload extends object> = Readonly<{
  type: TType;
  payload: TPayload;
}>;
