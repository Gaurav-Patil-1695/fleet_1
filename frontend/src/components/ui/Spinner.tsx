import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

const spinnerStyles = `
.spinner-ui {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--space-2);
}
.spinner-ui__ring {
  display: block;
  border-style: solid;
  border-color: var(--color-border-subtle);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spinner-ui-spin 0.7s linear infinite;
  flex-shrink: 0;
}
.spinner-ui__ring--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}
.spinner-ui__ring--md {
  width: 28px;
  height: 28px;
  border-width: 3px;
}
.spinner-ui__ring--lg {
  width: 44px;
  height: 44px;
  border-width: 4px;
}
@keyframes spinner-ui-spin {
  to { transform: rotate(360deg); }
}
.spinner-ui__label {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  color: var(--color-muted);
}
`;

let spinnerStyleInjected = false;

function ensureSpinnerStyles(): void {
  if (!spinnerStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = spinnerStyles;
    document.head.appendChild(style);
    spinnerStyleInjected = true;
  }
}

export function Spinner({
  size = 'md',
  label,
  style,
  className,
}: SpinnerProps): React.ReactElement {
  ensureSpinnerStyles();

  const wrapperClasses = ['spinner-ui', className].filter(Boolean).join(' ');
  const ringClasses = ['spinner-ui__ring', `spinner-ui__ring--${size}`].join(' ');

  return (
    <div
      className={wrapperClasses}
      style={style}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <span className={ringClasses} aria-hidden="true" />
      {label && (
        <span className="spinner-ui__label">{label}</span>
      )}
      {!label && (
        <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: '0' }}>
          Loading
        </span>
      )}
    </div>
  );
}

export default Spinner;
