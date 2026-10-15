import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  as?: React.ElementType;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const cardStyles = `
.card-ui {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-1);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
}
.card-ui--padding-none {
  padding: var(--space-0);
}
.card-ui--padding-sm {
  padding: var(--space-4);
}
.card-ui--padding-md {
  padding: var(--space-6);
}
.card-ui--padding-lg {
  padding: var(--space-8);
}
`;

let cardStyleInjected = false;

function ensureCardStyles(): void {
  if (!cardStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = cardStyles;
    document.head.appendChild(style);
    cardStyleInjected = true;
  }
}

export function Card({
  children,
  style,
  className,
  as: Component = 'div',
  padding = 'md',
  onClick,
}: CardProps): React.ReactElement {
  ensureCardStyles();

  const classes = [
    'card-ui',
    `card-ui--padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} style={style} onClick={onClick}>
      {children}
    </Component>
  );
}

export default Card;
