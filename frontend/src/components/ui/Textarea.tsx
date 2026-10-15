import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  isError?: boolean;
  id?: string;
  rows?: number;
}

const textareaStyles = `
.textarea-ui-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}
.textarea-ui-label {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-small);
  color: var(--color-body);
}
.textarea-ui {
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
  min-height: calc(var(--touch-target-min) * 2);
  box-sizing: border-box;
  outline: none;
  resize: vertical;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  -webkit-appearance: none;
  appearance: none;
}
.textarea-ui::placeholder {
  color: var(--color-muted);
  opacity: 1;
}
.textarea-ui:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 20%, transparent);
}
.textarea-ui:disabled {
  background-color: var(--color-surface-raised);
  color: var(--color-disabled);
  border-color: var(--color-border-subtle);
  cursor: not-allowed;
  opacity: 1;
  resize: none;
}
.textarea-ui--error {
  border-color: var(--color-error);
}
.textarea-ui--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 20%, transparent);
}
.textarea-ui-error-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-error);
}
.textarea-ui-hint-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-muted);
}
`;

let textareaStyleInjected = false;

function ensureTextareaStyles(): void {
  if (!textareaStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = textareaStyles;
    document.head.appendChild(style);
    textareaStyleInjected = true;
  }
}

let _idCounter = 0;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    hint,
    isError,
    id,
    rows = 4,
    className,
    style,
    disabled,
    ...props
  },
  ref,
): React.ReactElement {
  ensureTextareaStyles();

  const hasError = Boolean(error) || isError;
  const textareaId = id ?? `textarea-ui-${++_idCounter}`;
  const errorId = hasError ? `${textareaId}-error` : undefined;
  const hintId = hint && !hasError ? `${textareaId}-hint` : undefined;

  const textareaClasses = [
    'textarea-ui',
    hasError ? 'textarea-ui--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy =
    [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const textareaEl = (
    <textarea
      ref={ref}
      id={textareaId}
      className={textareaClasses}
      style={style}
      disabled={disabled}
      rows={rows}
      aria-invalid={hasError ? true : undefined}
      aria-describedby={describedBy}
      {...props}
    />
  );

  if (!label && !error && !hint) {
    return textareaEl;
  }

  return (
    <div className="textarea-ui-wrapper">
      {label && (
        <label className="textarea-ui-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      {textareaEl}
      {error && (
        <span id={errorId} className="textarea-ui-error-text" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="textarea-ui-hint-text">
          {hint}
        </span>
      )}
    </div>
  );
});

export default Textarea;
