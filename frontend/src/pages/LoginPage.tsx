import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { getErrorMessage } from '../utils/errorUtils';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): string | null {
    if (!email.trim() || !password.trim()) {
      return 'Email and password are required';
    }
    if (email.length > 320) {
      return 'Enter a valid email address.';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return 'Enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setPassword('');
      return;
    }

    setIsLoading(true);
    try {
      const tokenResponse = await login({ email, password });
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('access_token', tokenResponse.access_token);
      if (tokenResponse.token_type) {
        storage.setItem('token_type', tokenResponse.token_type);
      }

      const role = decodeRole(tokenResponse.access_token);
      if (role === 'technician') {
        navigate('/my-work-orders');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('credential') ||
        msg.toLowerCase().includes('401')
      ) {
        setError('Invalid email or password — please try again');
      } else {
        setError('Invalid email or password — please try again');
      }
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', color: 'var(--color-on-canvas)' }}>
        {/* Brand Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--space-8)',
            color: 'var(--color-on-canvas)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              background: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary-dark)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              boxShadow: 'var(--elevation-2)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-on-primary-dark)' }}
            >
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-display)',
              fontWeight: 'var(--font-weight-display)',
              lineHeight: 'var(--font-line-height-display)',
              color: 'var(--color-primary-dark)',
              letterSpacing: 'var(--font-letter-spacing-tight)',
            }}
          >
            FleetOps
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              marginTop: 'var(--space-1)',
              letterSpacing: 'var(--font-letter-spacing-wide)',
              textTransform: 'uppercase',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Fleet Management Platform
          </div>
        </div>

        {/* Login Card */}
        <div
          style={{
            padding: 'var(--space-8)',
            boxShadow: 'var(--elevation-3)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h1
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-h2)',
                color: 'var(--color-body)',
                margin: '0 0 var(--space-1) 0',
              }}
            >
              Sign in to your account
            </h1>
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                margin: '0',
              }}
            >
              Enter your credentials to access your depot.
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Alert variant="error" message={error} />
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-body)',
                  marginBottom: 'var(--space-2)',
                  letterSpacing: 'var(--font-letter-spacing-normal)',
                }}
              >
                Email address
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@depot.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 'var(--touch-target-min)' }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: 'var(--font-size-small)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-body)',
                    letterSpacing: 'var(--font-letter-spacing-normal)',
                  }}
                >
                  Password
                </label>
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-primary)',
                    fontWeight: 'var(--font-weight-medium)',
                    cursor: 'default',
                  }}
                >
                  Forgot password?
                </span>
              </div>
              <Input
                id="login-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 'var(--touch-target-min)' }}
              />
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <label
                htmlFor="login-remember"
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: 'var(--touch-target-min)',
                fontSize: 'var(--font-size-body)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-normal)',
                marginTop: 'var(--space-2)',
              }}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-6)',
            color: 'var(--color-on-canvas)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)', margin: '0' }}>
            Having trouble signing in? Contact your depot administrator.
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-ink)',
              margin: 'var(--space-2) 0 0 0',
            }}
          >
            FleetOps &copy; 2025 — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
