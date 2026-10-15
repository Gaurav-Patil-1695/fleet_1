import React, { useEffect, useRef, useCallback } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

const modalStyles = `
.modal-overlay-ui {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-overlay);
  padding: var(--space-4);
  animation: modal-overlay-in 200ms ease both;
}
.modal-overlay-ui--closing {
  animation: modal-overlay-out 200ms ease both;
}
@keyframes modal-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes modal-overlay-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.modal-ui {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-3);
  padding: var(--space-8);
  width: 100%;
  max-width: var(--content-narrow-width);
  max-height: calc(100vh - var(--space-16));
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: modal-slide-in 200ms ease both;
}
.modal-overlay-ui--closing .modal-ui {
  animation: modal-slide-out 200ms ease both;
}
@keyframes modal-slide-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes modal-slide-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(16px); }
}
.modal-ui__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-h3);
  line-height: var(--font-line-height-h3);
  color: var(--color-body);
  margin: 0;
}
.modal-ui__body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: var(--font-line-height-body);
  color: var(--color-muted);
  flex: 1;
}
.modal-ui__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: var(--space-2);
}
.modal-ui__close-btn {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  font-size: var(--font-size-h2);
  line-height: 1;
  padding: 0;
  transition: background-color 150ms ease, color 150ms ease;
}
.modal-ui__close-btn:hover {
  background-color: var(--color-surface-raised);
  color: var(--color-body);
}
.modal-ui__close-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
`;

let modalStyleInjected = false;

function ensureModalStyles(): void {
  if (!modalStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = modalStyles;
    document.head.appendChild(style);
    modalStyleInjected = true;
  }
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  style,
  className,
  'aria-label': ariaLabel,
}: ModalProps): React.ReactElement | null {
  ensureModalStyles();

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusable);
        if (focusableArray.length === 0) return;
        const first = focusableArray[0];
        const last = focusableArray[focusableArray.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus first focusable element inside the dialog
      const frame = requestAnimationFrame(() => {
        if (dialogRef.current) {
          const focusable = dialogRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusable?.focus();
        }
      });
      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay-ui"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={ariaLabel}
      aria-labelledby={title ? 'modal-ui-title' : undefined}
    >
      <div
        ref={dialogRef}
        className={['modal-ui', className].filter(Boolean).join(' ')}
        style={style}
      >
        <button
          className="modal-ui__close-btn"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          &#x2715;
        </button>

        {title && (
          <h3 id="modal-ui-title" className="modal-ui__title">
            {title}
          </h3>
        )}

        <div className="modal-ui__body">{children}</div>

        {actions && (
          <div className="modal-ui__actions">{actions}</div>
        )}
      </div>
    </div>
  );
}

export default Modal;
