import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  isError?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  id?: string;
}

const selectStyles = `
.select-ui-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}
.select-ui-label {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-small);
  color: var(--color-body);
}
.select-ui-container {
  position: relative;
  width: 100%;
}
.select-ui {
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: var(--font-line-height-body);
  color: var(--color-body);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
  width: 100%;
  min-height: var(--touch-target-min);
  box-sizing: border-box;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  background-image: none;
}
.select-ui::placeholder {
  color: var(--color-muted);
  opacity: 1;
}
.select-ui:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 20%, transparent);
}
.select-ui:disabled {
  background-color: var(--color-surface-raised);
  color: var(--color-disabled);
  border-color: var(--color-border-subtle);
  cursor: not-allowed;
  opacity: 1;
}
.select-ui--error {
  border-color: var(--color-error);
}
.select-ui--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 20%, transparent);
}
.select-ui-arrow {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.select-ui:disabled ~ .select-ui-arrow {
  color: var(--color-disabled);
}
.select-ui-error-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-error);
}
.select-ui-hint-text {
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-caption);
  line-height: var(--font-line-height-caption);
  color: var(--color-muted);
}
`;

let selectStyleInjected = false;

function ensureSelectStyles(): void {
  if (!selectStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = selectStyles;
    document.head.appendChild(style);
    selectStyleInjected = true;
  }
}

let _idCounter = 0;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    isError,
    options,
    placeholder,
    id,
    className,
    style,
    disabled,
    children,
    ...props
  },
  ref,
): React.ReactElement {
  ensureSelectStyles();

  const hasError = Boolean(error) || isError;
  const selectId = id ?? `select-ui-${++_idCounter}`;
  const errorId = hasError ? `${selectId}-error` : undefined;
  const hintId = hint && !hasError ? `${selectId}-hint` : undefined;

  const selectClasses = [
    'select-ui',
    hasError ? 'select-ui--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy =
    [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const chevronIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const selectEl = (
    <div className="select-ui-container">
      <select
        ref={ref}
        id={selectId}
        className={selectClasses}
        style={style}
        disabled={disabled}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
              >
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <span className="select-ui-arrow" aria-hidden="true">
        {chevronIcon}
      </span>
    </div>
  );

  if (!label && !error && !hint) {
    return selectEl;
  }

  return (
    <div className="select-ui-wrapper">
      {label && (
        <label className="select-ui-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      {selectEl}
      {error && (
        <span id={errorId} className="select-ui-error-text" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="select-ui-hint-text">
          {hint}
        </span>
      )}
    </div>
  );
});

export default Select;
