import React from 'react';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const alertStyles = `
.alert-ui {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  position: relative;
}
.alert-ui--success {
  background-color: var(--color-success-light);
  border-color: var(--color-success);
  color: var(--color-on-success);
}
.alert-ui--warning {
  background-color: var(--color-warning-light);
  border-color: var(--color-warning);
  color: var(--color-on-warning);
}
.alert-ui--error {
  background-color: var(--color-error-light);
  border-color: var(--color-error);
  color: var(--color-on-error);
}
.alert-ui--info {
  background-color: var(--color-info-light);
  border-color: var(--color-info);
  color: var(--color-on-info);
}
.alert-ui__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.alert-ui__icon img {
  width: 20px;
  height: 20px;
  display: block;
}
.alert-ui__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.alert-ui__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-small);
  margin: 0;
}
.alert-ui__message {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  margin: 0;
}
.alert-ui__dismiss {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: inherit;
  opacity: 0.7;
  font-size: var(--font-size-body);
  line-height: 1;
  padding: 0;
  transition: opacity 150ms ease, background-color 150ms ease;
  margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0;
}
.alert-ui__dismiss:hover {
  opacity: 1;
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}
.alert-ui__dismiss:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  opacity: 1;
}
`;

let alertStyleInjected = false;

function ensureAlertStyles(): void {
  if (!alertStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = alertStyles;
    document.head.appendChild(style);
    alertStyleInjected = true;
  }
}

const ICON_MAP: Record<AlertVariant, string> = {
  success: new URL('../../assets/icons/success.svg', import.meta.url).href,
  warning: new URL('../../assets/icons/warning.svg', import.meta.url).href,
  error: new URL('../../assets/icons/error.svg', import.meta.url).href,
  info: new URL('../../assets/icons/info.svg', import.meta.url).href,
};

const ARIA_ROLE_MAP: Record<AlertVariant, string> = {
  success: 'status',
  warning: 'alert',
  error: 'alert',
  info: 'status',
};

const VARIANT_LABEL: Record<AlertVariant, string> = {
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Information',
};

export function Alert({
  variant,
  title,
  message,
  onDismiss,
  style,
  className,
}: AlertProps): React.ReactElement {
  ensureAlertStyles();

  const classes = [
    'alert-ui',
    `alert-ui--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={style}
      role={ARIA_ROLE_MAP[variant]}
      aria-live={variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'}
    >
      <span className="alert-ui__icon" aria-hidden="true">
        <img
          src={ICON_MAP[variant]}
          alt={VARIANT_LABEL[variant]}
          width={20}
          height={20}
        />
      </span>

      <div className="alert-ui__body">
        {title && (
          <p className="alert-ui__title">{title}</p>
        )}
        <p className="alert-ui__message">{message}</p>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="alert-ui__dismiss"
          onClick={onDismiss}
          aria-label={`Dismiss ${VARIANT_LABEL[variant].toLowerCase()} alert`}
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}

export default Alert;
