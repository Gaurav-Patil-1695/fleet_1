import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  /**
   * Controls the typographic scale of the title.
   * 'display' uses type-display tokens (32px/40px bold).
   * 'h1' uses type-h1 tokens (24px/32px bold) — default.
   */
  level?: 'display' | 'h1';
}

const pageHeaderStyles = `
.page-header-ui {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  width: 100%;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
  margin-bottom: var(--space-6);
}
.page-header-ui__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}
.page-header-ui__title--display {
  font-family: var(--font-family-base);
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-display);
  line-height: var(--font-line-height-display);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-body);
  margin: 0;
  word-break: break-word;
}
.page-header-ui__title--h1 {
  font-family: var(--font-family-base);
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-h1);
  line-height: var(--font-line-height-h1);
  letter-spacing: var(--font-letter-spacing-tight);
  color: var(--color-body);
  margin: 0;
  word-break: break-word;
}
.page-header-ui__subtitle {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-small);
  line-height: var(--font-line-height-small);
  color: var(--color-muted);
  margin: 0;
}
.page-header-ui__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-top: var(--space-1);
}
@media (max-width: 640px) {
  .page-header-ui {
    flex-direction: column;
    align-items: stretch;
  }
  .page-header-ui__actions {
    padding-top: 0;
  }
}
`;

let pageHeaderStyleInjected = false;

function ensurePageHeaderStyles(): void {
  if (!pageHeaderStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = pageHeaderStyles;
    document.head.appendChild(style);
    pageHeaderStyleInjected = true;
  }
}

export function PageHeader({
  title,
  subtitle,
  actions,
  style,
  className,
  level = 'h1',
}: PageHeaderProps): React.ReactElement {
  ensurePageHeaderStyles();

  const wrapperClasses = ['page-header-ui', className].filter(Boolean).join(' ');
  const titleClass =
    level === 'display'
      ? 'page-header-ui__title--display'
      : 'page-header-ui__title--h1';

  return (
    <header className={wrapperClasses} style={style}>
      <div className="page-header-ui__text">
        <h1 className={titleClass}>{title}</h1>
        {subtitle && (
          <p className="page-header-ui__subtitle">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="page-header-ui__actions">{actions}</div>
      )}
    </header>
  );
}

export default PageHeader;
