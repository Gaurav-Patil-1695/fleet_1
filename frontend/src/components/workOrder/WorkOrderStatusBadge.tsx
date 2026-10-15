import React from 'react';
import { WorkOrderStatus } from '../../types/workOrder';
import Badge from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';

export interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
}

function getStatusConfig(status: WorkOrderStatus): {
  variant: BadgeVariant;
  label: string;
  icon: string;
} {
  switch (status) {
    case 'open':
      return { variant: 'info', label: 'Open', icon: '○' };
    case 'in_progress':
      return { variant: 'warning', label: 'In Progress', icon: '◑' };
    case 'closed':
      return { variant: 'success', label: 'Closed', icon: '✓' };
    case 'cancelled':
      return { variant: 'neutral', label: 'Cancelled', icon: '✕' };
    default:
      return { variant: 'neutral', label: status, icon: '○' };
  }
}

export function WorkOrderStatusBadge({
  status,
}: WorkOrderStatusBadgeProps): React.ReactElement {
  const { variant, label, icon } = getStatusConfig(status);

  return (
    <Badge variant={variant}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--font-size-caption)',
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        {label}
      </span>
    </Badge>
  );
}

export default WorkOrderStatusBadge;
