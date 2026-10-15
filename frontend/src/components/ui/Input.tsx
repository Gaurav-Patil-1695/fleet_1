import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  isError?: boolean;
  id?: string;
}

const inputStyles = `
.input-ui-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}
.input-ui-label {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-small);
  color: var(--color-body);
}
.input-ui {
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: var(--font-line-height-body);
  color: var(--color-body);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  min-height: var(--touch-target-min);
  box-sizing: border-box;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  -webkit-appearance: none;
  appearance: none;
}
.input-ui::placeholder {
  color: var(--color-muted);
  opacity: 1;
}
.input-ui:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 20%, transparent);
}
.input-ui:disabled {
  background-color: var(--color-surface-raised);
  color: var(--color-disabled);
  border-color: var(--color-border-subtle);
  cursor: not-allowed;
  opacity: 1;
}
.input-ui--error {
  border-color: var(--color-error);
}
.input-ui--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 20%, transparent);
}
.input-ui-error-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-error);
}
.input-ui-hint-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-muted);
}
`;

let inputStyleInjected = false;

function ensureInputStyles(): void {
  if (!inputStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = inputStyles;
    document.head.appendChild(style);
    inputStyleInjected = true;
  }
}

let _idCounter = 0;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    isError,
    id,
    className,
    style,
    disabled,
    ...props
  },
  ref,
): React.ReactElement {
  ensureInputStyles();

  const hasError = Boolean(error) || isError;
  const inputId = id ?? `input-ui-${++_idCounter}`;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const hintId = hint && !hasError ? `${inputId}-hint` : undefined;

  const inputClasses = [
    'input-ui',
    hasError ? 'input-ui--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const inputEl = (
    <input
      ref={ref}
      id={inputId}
      className={inputClasses}
      style={style}
      disabled={disabled}
      aria-invalid={hasError ? true : undefined}
      aria-describedby={describedBy}
      {...props}
    />
  );

  if (!label && !error && !hint) {
    return inputEl;
  }

  return (
    <div className="input-ui-wrapper">
      {label && (
        <label className="input-ui-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {inputEl}
      {error && (
        <span id={errorId} className="input-ui-error-text" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="input-ui-hint-text">
          {hint}
        </span>
      )}
    </div>
  );
});

export default Input;
