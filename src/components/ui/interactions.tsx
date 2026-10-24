"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./interactions.module.css";

type TabItem = Readonly<{ id: string; label: ReactNode; content: ReactNode; disabled?: boolean }>;
type TabsProps = { label: string; items: readonly TabItem[]; defaultTab?: string };

export function Tabs({ label, items, defaultTab }: TabsProps) {
  const prefix = useId();
  const first = items.find(item => !item.disabled)?.id;
  const [selected, setSelected] = useState(defaultTab ?? first);
  const activeId = items.some(item => item.id === selected && !item.disabled) ? selected : first;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const available = items.filter(item => !item.disabled);
    const index = available.findIndex(item => item.id === id);
    let next: TabItem | undefined;
    if (event.key === "ArrowRight") next = available[(index + 1) % available.length];
    else if (event.key === "ArrowLeft") next = available[(index - 1 + available.length) % available.length];
    else if (event.key === "Home") next = available[0];
    else if (event.key === "End") next = available.at(-1);
    if (!next) return;
    event.preventDefault();
    setSelected(next.id);
    tabRefs.current.get(next.id)?.focus();
  }
  return <div className={styles.tabs}>
    <div className={styles.tabList} role="tablist" aria-label={label}>
      {items.map(item => <button key={item.id} type="button" role="tab" className={styles.tab}
        id={`${prefix}-tab-${item.id}`} aria-controls={`${prefix}-panel-${item.id}`}
        aria-selected={activeId === item.id} tabIndex={activeId === item.id ? 0 : -1}
        disabled={item.disabled} ref={node => { if (node) tabRefs.current.set(item.id, node); else tabRefs.current.delete(item.id); }}
        onClick={() => setSelected(item.id)} onKeyDown={event => keyDown(event, item.id)}>{item.label}</button>)}
    </div>
    {items.map(item => <section key={item.id} role="tabpanel" className={styles.panel}
      id={`${prefix}-panel-${item.id}`} aria-labelledby={`${prefix}-tab-${item.id}`}
      tabIndex={0} hidden={activeId !== item.id}>{item.content}</section>)}
  </div>;
}

type DialogProps = { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode };

function dialogTabStops(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], area[href], button, input, select, textarea, iframe, object, embed, summary, [tabindex], [contenteditable="true"]',
  )).filter(element => {
    const visibility = getComputedStyle(element).visibility;
    return element.tabIndex >= 0 && !element.matches(":disabled, [aria-disabled=\"true\"]")
      && !element.closest("[hidden], [inert], [aria-hidden=\"true\"]")
      && element.getClientRects().length > 0 && visibility !== "hidden" && visibility !== "collapse";
  }).map((element, index) => ({ element, index })).sort((a, b) => {
    const aOrder = a.element.tabIndex || Number.MAX_SAFE_INTEGER;
    const bOrder = b.element.tabIndex || Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a.index - b.index;
  }).map(entry => entry.element);
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.defaultPrevented || !event.currentTarget.open) return;
    const dialog = event.currentTarget;
    const stops = dialogTabStops(dialog);
    event.preventDefault();
    if (!stops.length) { dialog.focus(); return; }
    const current = stops.findIndex(element => element === document.activeElement);
    const next = current < 0 ? event.shiftKey ? stops.length - 1 : 0
      : (current + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
    stops[next].focus();
  }
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  return <dialog ref={dialogRef} className={styles.dialog} tabIndex={-1} onKeyDown={trapTab}
    aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.dialogHeader}>
      <h2 id={`${id}-title`} className={styles.dialogTitle}>{title}</h2>
      <button ref={closeRef} className={styles.close} type="button" onClick={onClose} aria-label="대화상자 닫기">닫기 <span aria-hidden="true">×</span></button>
    </div>
    {description && <p id={`${id}-description`} className={styles.dialogDescription}>{description}</p>}
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}
