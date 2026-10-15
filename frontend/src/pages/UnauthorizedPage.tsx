import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function UnauthorizedPage(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Geometric accent motif */}
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '140px',
          marginBottom: 'var(--space-6)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {/* Background triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '80px solid transparent',
            borderRight: '80px solid transparent',
            borderBottom: '138px solid var(--color-lilac-40)',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        {/* Mid triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '60px solid transparent',
            borderRight: '60px solid transparent',
            borderBottom: '104px solid var(--color-lilac-60)',
            position: 'absolute',
            top: '18px',
            left: '20px',
          }}
        />
        {/* Inner triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '38px solid transparent',
            borderRight: '38px solid transparent',
            borderBottom: '66px solid var(--color-lilac-80)',
            position: 'absolute',
            top: '42px',
            left: '42px',
          }}
        />
        {/* Lock icon centre */}
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '22px',
            lineHeight: 1,
          }}
        >
          🔒
        </div>
      </div>

      {/* 403 display number */}
      <div
        style={{
          fontSize: '80px',
          fontWeight: 'var(--font-weight-display)',
          lineHeight: 1,
          letterSpacing: 'var(--font-letter-spacing-tight)',
          color: 'var(--color-error)',
          marginBottom: 'var(--space-4)',
          fontFamily: 'var(--font-family-base)',
        }}
      >
        403
      </div>

      {/* Card container */}
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: 'var(--space-8)',
          boxShadow: 'var(--elevation-2)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-h1)',
            fontWeight: 'var(--font-weight-h1)',
            lineHeight: 'var(--font-line-height-h1)',
            color: 'var(--color-ink)',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Access denied
        </h1>

        <p
          style={{
            fontSize: 'var(--font-size-body)',
            fontWeight: 'var(--font-weight-body)',
            lineHeight: 'var(--font-line-height-body)',
            color: 'var(--color-muted)',
            margin: '0 0 var(--space-6) 0',
          }}
        >
          You don&apos;t have permission to view this page. Contact your administrator if you believe
          this is an error.
        </p>

        {/* Status badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background: 'var(--color-error-light)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-caption)',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              textTransform: 'uppercase',
              fontWeight: 'var(--font-weight-semibold)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            Permission denied · RBAC enforced
          </span>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              background: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary-dark)',
              minHeight: 'var(--touch-target-min)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            Go to dashboard
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            style={{
              width: '100%',
              minHeight: 'var(--touch-target-min)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-primary)',
              fontSize: 'var(--font-size-body)',
            }}
          >
            ← Go back
          </Button>
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid var(--color-border-subtle)',
            margin: 'var(--space-6) 0 var(--space-4) 0',
          }}
        />

        {/* Help text */}
        <p
          style={{
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-muted)',
            margin: 0,
          }}
        >
          Need access?{' '}
          <span
            style={{
              color: 'var(--color-primary)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
            }}
            onClick={() => {
              // Request permissions action — out of scope for this build; no-op
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                // no-op
              }
            }}
          >
            Request permissions
          </span>
          &nbsp;or&nbsp;
          <span
            style={{
              color: 'var(--color-primary)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/login')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/login');
              }
            }}
          >
            sign in as a different user
          </span>
          .
        </p>
      </div>

      {/* Brand footer */}
      <p
        style={{
          marginTop: 'var(--space-6)',
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-muted)',
          letterSpacing: 'var(--font-letter-spacing-wide)',
          textTransform: 'uppercase',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        FleetOps · Fleet Management Platform
      </p>
    </div>
  );
}
