/** Serializable, presentation-independent results. Never echo rejected input. */
export type FieldError = Readonly<{ field: string; code: string }>;
export type DomainWarning = Readonly<{ code: string; field?: string }>;
export type DomainResult<T, Code extends string = string> =
  | Readonly<{ ok: true; value: T; warnings: readonly DomainWarning[] }>
  | Readonly<{ ok: false; code: Code; fieldErrors: readonly FieldError[] }>;

export function success<T>(value: T, warnings: readonly DomainWarning[] = []): DomainResult<T, never> {
  return { ok: true, value, warnings };
}
export function failure<Code extends string>(code: Code, field: string, fieldCode: string = code): DomainResult<never, Code> {
  return { ok: false, code, fieldErrors: [{ field, code: fieldCode }] };
}
