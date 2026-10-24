import type { ComponentProps, ReactNode } from "react";
import styles from "./primitives.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type Tone = "info" | "success" | "warning" | "danger" | "neutral";

function classes(...values: (string | undefined | false)[]) {
  return values.filter(Boolean).join(" ");
}

const symbols: Record<Tone, string> = {
  info: "i", success: "✓", warning: "!", danger: "×", neutral: "•",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

/** Loading prevents another submission; the caller announces its final result. */
export function Button({
  children, variant = "primary", loading = false, loadingLabel = "처리 중", disabled,
  className, type = "button", ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={classes(styles.button, styles[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export type ActionLinkProps = ComponentProps<"a"> & {
  variant?: Exclude<ButtonVariant, "destructive">;
};

/** Navigation keeps native anchor semantics, including opening a new tab. */
export function ActionLink({ children, variant = "primary", className, target, rel, ...props }: ActionLinkProps) {
  return (
    <a
      {...props}
      target={target}
      rel={target === "_blank" ? [rel, "noopener", "noreferrer"].filter(Boolean).join(" ") : rel}
      className={classes(styles.button, styles[variant], className)}
    >
      {children}
    </a>
  );
}

export type BadgeProps = ComponentProps<"span"> & { tone?: Tone };

export function Badge({ children, tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span {...props} className={classes(styles.badge, styles[tone], className)}>
      <span className={styles.badgeIcon} aria-hidden="true">{symbols[tone]}</span>
      <span>{children}</span>
    </span>
  );
}

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  tone?: Exclude<Tone, "neutral">;
};

/** Important errors belong in the page; a transient toast is never sufficient. */
export function Alert({ title, children, tone = "info", role, className, ...props }: AlertProps) {
  return (
    <div
      {...props}
      role={role ?? (tone === "danger" ? "alert" : "status")}
      aria-atomic={props["aria-atomic"] ?? true}
      className={classes(styles.alert, styles[tone], className)}
    >
      <span className={styles.alertIcon} aria-hidden="true">{symbols[tone]}</span>
      <div className={styles.alertBody}>
        <strong className={styles.alertTitle}>{title}</strong>
        {children != null && <div className={styles.alertDescription}>{children}</div>}
      </div>
    </div>
  );
}

export type ToastProps = ComponentProps<"div"> & { tone?: Exclude<Tone, "neutral"> };

/** Inline feedback has no auto-dismiss timer or hidden persistence claim. */
export function Toast({ children, tone = "info", className, ...props }: ToastProps) {
  return (
    <div
      {...props}
      role="status"
      aria-atomic="true"
      className={classes(styles.toast, styles[tone], className)}
    >
      <span aria-hidden="true" className={styles.alertIcon}>{symbols[tone]}</span>
      <span>{children}</span>
    </div>
  );
}

export type SkeletonProps = ComponentProps<"div"> & { label?: string; lines?: number };

export function Skeleton({ label = "내용을 불러오는 중입니다", lines = 3, className, ...props }: SkeletonProps) {
  // Keep a bad presentation prop from creating an unbounded DOM array.
  const count = Number.isInteger(lines) ? Math.max(1, Math.min(lines, 12)) : 3;
  return (
    <div {...props} className={classes(styles.skeleton, className)} role="status" aria-busy="true">
      <span className={styles.srOnly}>{label}</span>
      <div aria-hidden="true" className={styles.skeletonLines}>
        {Array.from({ length: count }, (_, index) => <div className={styles.skeletonLine} key={index} />)}
      </div>
    </div>
  );
}

export type EmptyStateProps = Omit<ComponentProps<"section">, "title"> & {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3;
};

export function EmptyState({
  title, description, action, headingLevel = 2, className, ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <section {...props} className={classes(styles.emptyState, className)}>
      <span className={styles.emptyIcon} aria-hidden="true">i</span>
      <Heading className={styles.emptyTitle}>{title}</Heading>
      <div className={styles.emptyDescription}>{description}</div>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </section>
  );
}

export function Card({ children, className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={classes(styles.card, className)}>{children}</div>;
}

/** Test-gallery marker only: no ad SDK, reserved ad height or network request. */
export function AdSlotPlaceholder({ label = "광고 비활성", className, ...props }: ComponentProps<"div"> & { label?: string }) {
  return (
    <div {...props} className={classes(styles.adPlaceholder, className)}>
      <span aria-hidden="true">⊘</span>
      <span>{label} · 테스트용 자리 표시</span>
    </div>
  );
}
