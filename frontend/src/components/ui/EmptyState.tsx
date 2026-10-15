import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const emptyStateStyles = `
.empty-state-ui {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-6);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}
.empty-state-ui__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface-raised);
  color: var(--color-muted);
  flex-shrink: 0;
}
.empty-state-ui__icon svg {
  width: 32px;
  height: 32px;
  display: block;
}
.empty-state-ui__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-h3);
  line-height: var(--font-line-height-h3);
  color: var(--color-body);
  margin: 0;
}
.empty-state-ui__description {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  color: var(--color-muted);
  margin: 0;
  max-width: 360px;
}
.empty-state-ui__action {
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
`;

let emptyStateStyleInjected = false;

function ensureEmptyStateStyles(): void {
  if (!emptyStateStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = emptyStateStyles;
    document.head.appendChild(style);
    emptyStateStyleInjected = true;
  }
}

const DefaultIcon: React.FC = () => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="6"
      width="24"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M4 12h24"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M10 18h4M10 22h8"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export function EmptyState({
  title,
  description,
  action,
  icon,
  style,
  className,
}: EmptyStateProps): React.ReactElement {
  ensureEmptyStateStyles();

  const classes = ['empty-state-ui', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} role="status" aria-label={title}>
      <div className="empty-state-ui__icon" aria-hidden="true">
        {icon ?? <DefaultIcon />}
      </div>

      <p className="empty-state-ui__title">{title}</p>

      {description && (
        <p className="empty-state-ui__description">{description}</p>
      )}

      {action && (
        <div className="empty-state-ui__action">{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
