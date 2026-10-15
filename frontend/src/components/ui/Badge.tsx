import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const badgeStyles = `
.badge-ui {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-family-base);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-caption);
  letter-spacing: var(--font-letter-spacing-wide);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  white-space: nowrap;
  user-select: none;
}
.badge-ui--success {
  background-color: var(--color-success-light);
  color: var(--color-on-success);
}
.badge-ui--warning {
  background-color: var(--color-warning-light);
  color: var(--color-on-warning);
}
.badge-ui--error {
  background-color: var(--color-error-light);
  color: var(--color-on-error);
}
.badge-ui--info {
  background-color: var(--color-info-light);
  color: var(--color-on-info);
}
.badge-ui--neutral {
  background-color: var(--color-surface-raised);
  color: var(--color-muted);
}
.badge-ui--accent {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}
`;

let badgeStyleInjected = false;

function ensureBadgeStyles(): void {
  if (!badgeStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = badgeStyles;
    document.head.appendChild(style);
    badgeStyleInjected = true;
  }
}

function getVariantIcon(variant: BadgeVariant): React.ReactElement | null {
  const iconStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    flexShrink: 0,
    display: 'inline-block',
    borderRadius: 'var(--radius-full)',
  };

  switch (variant) {
    case 'success':
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-success)',
          }}
        />
      );
    case 'warning':
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-warning)',
          }}
        />
      );
    case 'error':
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-error)',
          }}
        />
      );
    case 'info':
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-info)',
          }}
        />
      );
    case 'accent':
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-accent)',
          }}
        />
      );
    case 'neutral':
    default:
      return (
        <span
          aria-hidden="true"
          style={{
            ...iconStyle,
            backgroundColor: 'var(--color-muted)',
          }}
        />
      );
  }
}

export function Badge({
  variant = 'neutral',
  children,
  style,
  className,
}: BadgeProps): React.ReactElement {
  ensureBadgeStyles();

  const classes = [
    'badge-ui',
    `badge-ui--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={style}>
      {getVariantIcon(variant)}
      {children}
    </span>
  );
}

export default Badge;
