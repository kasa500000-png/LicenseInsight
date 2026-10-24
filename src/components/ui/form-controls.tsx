"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type FormEvent, type ReactNode } from "react";
import { parseLocalDate } from "@/domain/date";
import styles from "./form-controls.module.css";

type FieldDescriptionProps = { id: string; hint?: ReactNode; error?: string };
type FieldLabelProps = FieldDescriptionProps & { label: ReactNode };
type InputProps = Omit<ComponentPropsWithRef<"input">, "id"> & FieldLabelProps;
type SelectProps = Omit<ComponentPropsWithRef<"select">, "id"> & FieldLabelProps;
type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "id" | "type"> & FieldLabelProps;

function describedBy(id: string, hint: ReactNode, error: string | undefined, other?: string) {
  return [other, hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined;
}

function FieldDescription({ id, hint, error }: FieldDescriptionProps) {
  return <>
    {hint && <p className={styles.hint} id={`${id}-hint`}>{hint}</p>}
    {error && <p className={styles.error} id={`${id}-error`}><span aria-hidden="true">! </span>{error}</p>}
  </>;
}

export function Input({ id, label, hint, error, className, ...props }: InputProps) {
  return <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>{label}</label>
    <input {...props} id={id} className={[styles.control, className].filter(Boolean).join(" ")}
      aria-invalid={error ? true : props["aria-invalid"]}
      aria-describedby={describedBy(id, hint, error, props["aria-describedby"])} />
    <FieldDescription id={id} hint={hint} error={error} />
  </div>;
}

export function Select({ id, label, hint, error, className, children, ...props }: SelectProps) {
  return <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>{label}</label>
    <select {...props} id={id} className={[styles.control, className].filter(Boolean).join(" ")}
      aria-invalid={error ? true : props["aria-invalid"]}
      aria-describedby={describedBy(id, hint, error, props["aria-describedby"])}>{children}</select>
    <FieldDescription id={id} hint={hint} error={error} />
  </div>;
}

export function Checkbox({ id, label, hint, error, className, ...props }: CheckboxProps) {
  return <div className={styles.field}>
    <label className={styles.checkboxLabel} htmlFor={id}>
      <input {...props} id={id} type="checkbox" className={[styles.checkbox, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(id, hint, error, props["aria-describedby"])} />
      <span>{label}</span>
    </label>
    <FieldDescription id={id} hint={hint} error={error} />
  </div>;
}

type SearchBoxProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  onSearch: (query: string) => void;
  busy?: boolean;
};

export function SearchBox({ id, label = "자격증 검색", placeholder = "종목명을 입력해 주세요", defaultValue = "", onSearch, busy = false }: SearchBoxProps) {
  const generatedId = useId();
  const inputId = id ?? `search-${generatedId}`;
  const [query, setQuery] = useState(defaultValue);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) onSearch(query.trim());
  }
  return <form className={styles.search} role="search" aria-label={label} onSubmit={submit}>
    <label className={styles.label} htmlFor={inputId}>{label}</label>
    <div className={styles.searchRow}>
      <input id={inputId} className={styles.control} type="search" value={query} placeholder={placeholder}
        maxLength={500} onChange={event => setQuery(event.currentTarget.value)} disabled={busy} />
      <button type="submit" className={styles.submit} disabled={busy} aria-busy={busy}>{busy ? "검색 중" : "검색"}</button>
    </div>
  </form>;
}

type DateFieldProps = {
  id: string;
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
};

export function DateField({ id, label, value, onValueChange, hint = "달력에서 날짜를 선택하거나 표시된 형식으로 입력해 주세요.", error, min, max, required = false, disabled }: DateFieldProps) {
  const [touched, setTouched] = useState(false);
  const date = value === "" ? null : parseLocalDate(value);
  const validationError = value === "" ? required && touched ? "날짜를 입력해 주세요." : undefined
    : !date?.ok ? "실제 달력에 있는 날짜를 입력해 주세요."
      : min && parseLocalDate(min).ok && value < min ? "선택 가능한 시작 날짜보다 빠릅니다."
        : max && parseLocalDate(max).ok && value > max ? "선택 가능한 마지막 날짜보다 늦습니다." : undefined;
  return <Input id={id} label={label} type="date" value={value} min={min} max={max} required={required}
    disabled={disabled} hint={hint} error={error ?? validationError}
    onChange={event => { setTouched(true); onValueChange(event.currentTarget.value); }}
    onBlur={() => setTouched(true)} />;
}

export type DurationParseResult = { ok: true; minutes: number } | { ok: false; code: "REQUIRED" | "INTEGER_REQUIRED" | "OUT_OF_RANGE" };

/** UI input parsing only; domain planner still validates its integer-minute input. */
export function parseDuration(hours: string, minutes: string): DurationParseResult {
  if (hours === "" || minutes === "") return { ok: false, code: "REQUIRED" };
  if (!/^\d{1,4}$/.test(hours) || !/^\d{1,4}$/.test(minutes)) return { ok: false, code: "INTEGER_REQUIRED" };
  const h = Number(hours), m = Number(minutes);
  if (h > 24 || m > 59 || h * 60 + m > 1440) return { ok: false, code: "OUT_OF_RANGE" };
  return { ok: true, minutes: h * 60 + m };
}

type DurationFieldProps = {
  id: string;
  label: ReactNode;
  value: number;
  onValueChange: (minutes: number) => void;
  onValidityChange?: (valid: boolean) => void;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
};
type DurationDraft = { observedValue: number; hours: string; minutes: string; touched: boolean };
function initialDuration(value: number): DurationDraft {
  const valid = Number.isInteger(value) && value >= 0 && value <= 1440;
  return { observedValue: value, hours: valid ? String(Math.floor(value / 60)) : "", minutes: valid ? String(value % 60) : "", touched: false };
}

function durationError(result: DurationParseResult): string | undefined {
  if (result.ok) return undefined;
  return result.code === "REQUIRED" ? "시간과 분을 모두 입력해 주세요."
    : result.code === "INTEGER_REQUIRED" ? "시간과 분은 0 이상의 정수로 입력해 주세요."
      : "하루 0~1440분 범위이며, 분은 0~59로 입력해 주세요.";
}

export function DurationField({ id, label, value, onValueChange, onValidityChange, hint = "하루 0~24시간 범위이며, 분은 0~59로 입력해 주세요.", error, disabled }: DurationFieldProps) {
  const [draft, setDraft] = useState(() => initialDuration(value));
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const lastValidity = useRef<boolean | undefined>(undefined);
  // Synchronize an externally changed controlled value without an effect or losing
  // focus. Invalid local drafts leave the parent's last valid integer untouched.
  if (!Object.is(draft.observedValue, value)) setDraft(initialDuration(value));
  const parsed = parseDuration(draft.hours, draft.minutes);
  const validationError = durationError(parsed);
  const message = error ?? validationError;
  const valid = parsed.ok && !error;
  // The last valid numeric value is intentionally retained by the caller while
  // the draft is invalid. Also expose validity so it cannot be mistaken for a
  // valid form submission, and participate in native form.checkValidity().
  useEffect(() => {
    hoursRef.current?.setCustomValidity(message ?? "");
    minutesRef.current?.setCustomValidity(message ?? "");
    if (lastValidity.current !== valid) {
      lastValidity.current = valid;
      onValidityChange?.(valid);
    }
  }, [message, valid, onValidityChange]);
  function update(part: "hours" | "minutes", raw: string) {
    const next = { ...draft, [part]: raw, touched: true };
    setDraft(next);
    const result = parseDuration(next.hours, next.minutes);
    const nextMessage = error ?? durationError(result);
    hoursRef.current?.setCustomValidity(nextMessage ?? "");
    minutesRef.current?.setCustomValidity(nextMessage ?? "");
    const nextValid = result.ok && !error;
    if (lastValidity.current !== nextValid) {
      lastValidity.current = nextValid;
      onValidityChange?.(nextValid);
    }
    if (result.ok) onValueChange(result.minutes);
  }
  return <fieldset className={styles.duration} aria-describedby={describedBy(id, hint, message)}>
    <legend className={styles.label}>{label}</legend>
    <div className={styles.durationRow}>
      <div className={styles.durationPart}>
        <label className={styles.unitLabel} htmlFor={`${id}-hours`}>시간</label>
        <input ref={hoursRef} className={styles.control} id={`${id}-hours`} type="text" inputMode="numeric" value={draft.hours}
          maxLength={4} disabled={disabled} aria-invalid={message ? true : undefined} aria-describedby={describedBy(id, hint, message)}
          onChange={event => update("hours", event.currentTarget.value)} />
      </div>
      <div className={styles.durationPart}>
        <label className={styles.unitLabel} htmlFor={`${id}-minutes`}>분</label>
        <input ref={minutesRef} className={styles.control} id={`${id}-minutes`} type="text" inputMode="numeric" value={draft.minutes}
          maxLength={4} disabled={disabled} aria-invalid={message ? true : undefined} aria-describedby={describedBy(id, hint, message)}
          onChange={event => update("minutes", event.currentTarget.value)} />
      </div>
    </div>
    <FieldDescription id={id} hint={hint} error={message} />
  </fieldset>;
}
