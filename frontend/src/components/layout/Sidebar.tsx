import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Depot Dashboard',
        path: '/dashboard',
        roles: ['manager', 'technician'],
      },
    ],
  },
  {
    label: 'Vehicles',
    items: [
      {
        label: 'Vehicle List',
        path: '/vehicles',
        roles: ['administrator', 'manager', 'technician'],
      },
      {
        label: 'Add Vehicle',
        path: '/vehicles/add',
        roles: ['administrator', 'manager'],
      },
      {
        label: 'Manual Odometer Entry',
        path: '/readings/manual',
        roles: ['administrator', 'manager', 'technician'],
      },
    ],
  },
  {
    label: 'Work Orders',
    items: [
      {
        label: 'Work Order List',
        path: '/work-orders',
        roles: ['manager', 'technician'],
      },
      {
        label: 'Create Work Order',
        path: '/work-orders/create',
        roles: ['administrator', 'manager'],
      },
      {
        label: 'My Work Orders',
        path: '/work-orders/my',
        roles: ['technician'],
      },
    ],
  },
  {
    label: 'Schedules',
    items: [
      {
        label: 'Schedule List',
        path: '/schedules',
        roles: ['administrator', 'manager'],
      },
      {
        label: 'Create Schedule',
        path: '/schedules/create',
        roles: ['administrator'],
      },
    ],
  },
];

function Sidebar(): React.ReactElement {
  const { user } = useAuth();
  const location = useLocation();

  const userRole = user?.role as UserRole | undefined;

  const isAllowed = (roles: UserRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '240px',
    minWidth: '240px',
    backgroundColor: 'var(--color-primary-dark)',
    color: 'var(--color-on-primary-dark)',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const brandStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--space-6) var(--space-5)',
    fontSize: 'var(--font-size-h2)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    letterSpacing: 'var(--font-letter-spacing-tight)',
    color: 'var(--color-white)',
    borderBottom: '1px solid rgba(255,255,255,0.10)',
    userSelect: 'none',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-3) 0',
    flex: 1,
  };

  const groupLabelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase',
    color: 'var(--color-primary-light)',
    padding: 'var(--space-4) var(--space-5) var(--space-1)',
    marginTop: 'var(--space-2)',
  };

  const getNavLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--space-2) var(--space-5)',
    fontSize: 'var(--font-size-small)',
    fontWeight: isActive
      ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
      : ('var(--font-weight-regular)' as React.CSSProperties['fontWeight']),
    color: isActive ? 'var(--color-white)' : 'rgba(255,255,255,0.72)',
    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
    borderRadius: 'var(--radius-sm)',
    margin: '1px var(--space-3)',
    textDecoration: 'none',
    transition: 'background-color 150ms ease, color 150ms ease',
    minHeight: 'var(--touch-target-min)',
    lineHeight: 'var(--font-line-height-body)',
    cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <aside style={sidebarStyle}>
      <div style={brandStyle}>
        <span>FleetOps</span>
      </div>
      <nav style={navStyle}>
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => isAllowed(item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <React.Fragment key={group.label}>
              <div style={groupLabelStyle}>{group.label}</div>
              {visibleItems.map((item) => {
                const isActive =
                  item.path === '/vehicles'
                    ? location.pathname === '/vehicles' || (location.pathname.startsWith('/vehicles') && !location.pathname.startsWith('/vehicles/add'))
                    : item.path === '/work-orders'
                    ? location.pathname === '/work-orders' || (location.pathname.startsWith('/work-orders/') && !location.pathname.startsWith('/work-orders/create') && !location.pathname.startsWith('/work-orders/my'))
                    : item.path === '/schedules'
                    ? location.pathname === '/schedules' || (location.pathname.startsWith('/schedules/') && !location.pathname.startsWith('/schedules/create'))
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive: navActive }) =>
                      getNavLinkStyle(navActive)
                    }
                    end={item.path === '/vehicles' || item.path === '/work-orders' || item.path === '/schedules'}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      if (!el.classList.contains('active-link')) {
                        el.style.backgroundColor = 'rgba(255,255,255,0.10)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      if (!el.classList.contains('active-link')) {
                        el.style.backgroundColor = isActive ? 'var(--color-primary)' : 'transparent';
                      }
                    }}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
