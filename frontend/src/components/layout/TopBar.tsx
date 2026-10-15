import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDepotDashboard } from '../../hooks/useDepotDashboard';
import { useContext } from 'react';
import { DepotContext } from '../../context/DepotContext';

function TopBar(): React.ReactElement {
  const { user, logout } = useAuth();
  const depotContext = useContext(DepotContext);
  const depotId = depotContext?.selectedDepotId ?? null;
  const { dashboard } = useDepotDashboard(depotId);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore logout errors
    }
  };

  const getRoleLabel = (role: string | undefined): string => {
    if (role === 'administrator') return 'Administrator';
    if (role === 'manager') return 'Manager';
    if (role === 'technician') return 'Technician';
    return '';
  };

  const topBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    minHeight: '56px',
    padding: '0 var(--space-6)',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border-subtle)',
    boxShadow: 'var(--elevation-1)',
    flexShrink: 0,
    zIndex: 10,
    boxSizing: 'border-box',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    minWidth: 0,
  };

  const depotNameStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
    color: 'var(--color-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const depotLabelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase' as React.CSSProperties['textTransform'],
    color: 'var(--color-primary)',
    marginRight: 'var(--space-1)',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    flexShrink: 0,
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  };

  const userNameStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
    color: 'var(--color-body)',
    lineHeight: 'var(--font-line-height-small)',
    whiteSpace: 'nowrap',
  };

  const userRoleStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--font-line-height-caption)',
    whiteSpace: 'nowrap',
  };

  const avatarStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    flexShrink: 0,
    userSelect: 'none',
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--color-border-subtle)',
    flexShrink: 0,
  };

  const logoutButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
    color: 'var(--color-muted)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
    minHeight: 'var(--touch-target-min)',
    whiteSpace: 'nowrap',
    outline: 'none',
    fontFamily: 'var(--font-family-base)',
  };

  const getInitials = (fullName: string | undefined): string => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const depotName = dashboard?.depot_name ?? depotContext?.selectedDepotId ?? null;

  return (
    <header style={topBarStyle}>
      <div style={leftSectionStyle}>
        {depotName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={depotLabelStyle}>Depot</span>
            <span style={depotNameStyle}>{depotName}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={depotLabelStyle}>FleetOps</span>
          </div>
        )}
      </div>

      <div style={rightSectionStyle}>
        {user && (
          <>
            <div style={userInfoStyle}>
              <span style={userNameStyle}>{user.full_name}</span>
              <span style={userRoleStyle}>{getRoleLabel(user.role)}</span>
            </div>
            <div style={avatarStyle} aria-hidden="true">
              {getInitials(user.full_name)}
            </div>
            <div style={dividerStyle} aria-hidden="true" />
          </>
        )}
        <button
          style={logoutButtonStyle}
          onClick={handleLogout}
          aria-label="Log out"
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'var(--color-surface-raised)';
            el.style.color = 'var(--color-error)';
            el.style.borderColor = 'var(--color-error)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'transparent';
            el.style.color = 'var(--color-muted)';
            el.style.borderColor = 'var(--color-border-subtle)';
          }}
          onFocus={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.outline = `2px solid var(--color-focus-ring)`;
            el.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.outline = 'none';
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}

export default TopBar;
