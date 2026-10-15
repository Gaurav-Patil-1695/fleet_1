import React from 'react';
import { WorkOrder } from '../../types/workOrder';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatDateTime } from '../../utils/dateUtils';
import WorkOrderStatusBadge from './WorkOrderStatusBadge';

export interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: (workOrder: WorkOrder) => void;
  actions?: React.ReactNode;
}

export function WorkOrderCard({
  workOrder,
  onClick,
  actions,
}: WorkOrderCardProps): React.ReactElement {
  const handleClick = onClick ? () => onClick(workOrder) : undefined;

  return (
    <Card
      onClick={handleClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-muted)',
              letterSpacing: 'var(--font-letter-spacing-wide)',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            WO #{workOrder.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <WorkOrderStatusBadge status={workOrder.status} />
      </div>

      {/* Description */}
      {workOrder.description && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-body)',
            lineHeight: 'var(--font-line-height-body)',
            color: 'var(--color-body)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {workOrder.description}
        </p>
      )}

      {/* Meta details */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {/* Vehicle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              minWidth: 80,
            }}
          >
            Vehicle
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-body)',
              fontFamily: 'var(--font-family-mono)',
              background: 'var(--color-surface-raised)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {workOrder.vehicle_id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Technician */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              minWidth: 80,
            }}
          >
            Technician
          </span>
          {workOrder.assigned_technician_id ? (
            <Badge variant="info">
              {workOrder.assigned_technician_id.slice(0, 8).toUpperCase()}
            </Badge>
          ) : (
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                fontStyle: 'italic',
              }}
            >
              Unassigned
            </span>
          )}
        </div>

        {/* Raised at */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              minWidth: 80,
            }}
          >
            Raised
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-body)',
            }}
          >
            {formatDateTime(workOrder.raised_at)}
          </span>
        </div>

        {/* Closed at (if applicable) */}
        {workOrder.closed_at && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-muted)',
                minWidth: 80,
              }}
            >
              Closed
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
              }}
            >
              {formatDateTime(workOrder.closed_at)}
            </span>
          </div>
        )}

        {/* Completion notes (if closed) */}
        {workOrder.completion_notes && (
          <div
            style={{
              marginTop: 'var(--space-1)',
              padding: 'var(--space-3)',
              background: 'var(--color-canvas)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--color-success)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-muted)',
                display: 'block',
                marginBottom: 'var(--space-1)',
              }}
            >
              Completion Notes
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
                lineHeight: 'var(--font-line-height-small)',
              }}
            >
              {workOrder.completion_notes}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-2)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        >
          {actions}
        </div>
      )}
    </Card>
  );
}

export default WorkOrderCard;
