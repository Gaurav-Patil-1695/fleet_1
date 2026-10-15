import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const BASE_STYLES: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-family-base)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--font-line-height-small)',
  letterSpacing: 'var(--font-letter-spacing-normal)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  transition: 'background-color 150ms ease, box-shadow 150ms ease, opacity 150ms ease, transform 100ms ease',
  minHeight: 'var(--touch-target-min)',
  outline: 'none',
};

function getSizeStyles(size: ButtonSize): React.CSSProperties {
  switch (size) {
    case 'sm':
      return {
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--font-size-caption)',
        lineHeight: 'var(--font-line-height-caption)',
        minHeight: '36px',
      };
    case 'lg':
      return {
        padding: 'var(--space-3) var(--space-8)',
        fontSize: 'var(--font-size-body)',
        lineHeight: 'var(--font-line-height-body)',
      };
    case 'md':
    default:
      return {
        padding: 'var(--space-2) var(--space-5)',
      };
  }
}

function getVariantStyles(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-on-primary)',
      };
    case 'secondary':
      return {
        backgroundColor: 'var(--color-surface-raised)',
        color: 'var(--color-body)',
        border: '1px solid var(--color-border)',
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: 'var(--color-primary)',
      };
    case 'destructive':
      return {
        backgroundColor: 'var(--color-error)',
        color: 'var(--color-on-error)',
      };
    default:
      return {};
  }
}

function getDisabledStyles(): React.CSSProperties {
  return {
    opacity: 0.5,
    cursor: 'not-allowed',
  };
}

const Spinner: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: 'var(--radius-full)',
      animation: 'btn-spin 0.7s linear infinite',
    }}
    aria-hidden="true"
  />
);

const spinKeyframes = `
@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
.btn-ui:hover:not(:disabled) {
  filter: brightness(0.92);
}
.btn-ui:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-ui:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 30%, transparent);
}
`;

let styleInjected = false;

function ensureStyles(): void {
  if (!styleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = spinKeyframes;
    document.head.appendChild(style);
    styleInjected = true;
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps): React.ReactElement {
  ensureStyles();

  const isDisabled = disabled || isLoading;

  const combinedStyle: React.CSSProperties = {
    ...BASE_STYLES,
    ...getSizeStyles(size),
    ...getVariantStyles(variant),
    ...(isDisabled ? getDisabledStyles() : {}),
    ...style,
  };

  return (
    <button
      {...props}
      className={['btn-ui', props.className].filter(Boolean).join(' ')}
      disabled={isDisabled}
      style={combinedStyle}
      aria-busy={isLoading ? true : undefined}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}

export default Button;
