import React from 'react';
import type { DepotDashboard } from '../../types/depot';

export interface DashboardStatsProps {
  dashboard: DepotDashboard;
}

export function DashboardStats({ dashboard }: DashboardStatsProps): React.ReactElement {
  const stats: Array<{
    label: string;
    value: number;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = [
    {
      label: 'Total Vehicles',
      value: dashboard.total_vehicles ?? (dashboard.due_for_service.length + dashboard.overdue.length),
      color: 'var(--color-primary)',
      bgColor: 'var(--color-surface)',
      borderColor: 'var(--color-border-subtle)',
    },
    {
      label: 'Active Vehicles',
      value: dashboard.active_vehicles ?? 0,
      color: 'var(--color-success)',
      bgColor: 'var(--color-success-light)',
      borderColor: 'var(--color-sage-80)',
    },
    {
      label: 'Due for Service',
      value: dashboard.due_for_service.length,
      color: 'var(--color-on-warning)',
      bgColor: 'var(--color-warning-light)',
      borderColor: 'var(--color-gold-80)',
    },
    {
      label: 'Overdue',
      value: dashboard.overdue.length,
      color: 'var(--color-error)',
      bgColor: 'var(--color-error-light)',
      borderColor: 'var(--color-secondary-dark)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-4)',
        width: '100%',
      }}
      role="region"
      aria-label="Depot summary statistics"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: stat.bgColor,
            border: `1px solid ${stat.borderColor}`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            boxShadow: 'var(--elevation-1)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
            }}
          >
            {stat.label}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-display)',
              fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
              lineHeight: 'var(--font-line-height-display)',
              color: stat.color,
            }}
            aria-label={`${stat.label}: ${stat.value}`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
