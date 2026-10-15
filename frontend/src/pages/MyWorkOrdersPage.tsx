import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyWorkOrders } from '../hooks/useMyWorkOrders';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/dateUtils';
import type { WorkOrderStatus } from '../types/workOrder';
import type { WorkOrder } from '../types/workOrder';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import WorkOrderStatusBadge from '../components/workOrder/WorkOrderStatusBadge';

type FilterStatus = 'all' | WorkOrderStatus;

function statusBorderColor(status: WorkOrderStatus): string {
  switch (status) {
    case 'in_progress':
      return 'var(--color-info)';
    case 'open':
      return 'var(--color-warning)';
    case 'closed':
    case 'cancelled':
      return 'var(--color-border-subtle)';
    default:
      return 'var(--color-border-subtle)';
  }
}

function isCloseable(status: WorkOrderStatus): boolean {
  return status === 'open' || status === 'in_progress';
}

function SkeletonRow(): React.ReactElement {
  return (
    <div
      style={{
        height: '100px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-raised)',
        borderLeft: '4px solid var(--color-border)',
        boxShadow: 'var(--elevation-1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent 0%, var(--color-canvas) 50%, transparent 100%)',
          animation: 'shimmer 1.4s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

interface WorkOrderRowProps {
  workOrder: WorkOrder;
}

function WorkOrderRow({ workOrder }: WorkOrderRowProps): React.ReactElement {
  const navigate = useNavigate();
  const isClosed = !isCloseable(workOrder.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/work-orders/${workOrder.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/work-orders/${workOrder.id}`);
        }
      }}
      style={{
        padding: 'var(--space-5)',
        borderLeft: `4px solid ${statusBorderColor(workOrder.status)}`,
        cursor: 'pointer',
        boxShadow: 'var(--elevation-1)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
        opacity: isClosed ? 0.78 : 1,
        outline: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* ID + status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-bold)',
                color: isClosed ? 'var(--color-muted)' : 'var(--color-primary)',
              }}
            >
              #{workOrder.id.slice(0, 8).toUpperCase()}
            </span>
            <WorkOrderStatusBadge status={workOrder.status} />
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-semibold)',
              color: isClosed ? 'var(--color-muted)' : 'var(--color-ink)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {workOrder.description ?? '—'}
          </p>

          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-5)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
              }}
            >
              🚌{' '}
              <strong style={{ color: isClosed ? 'var(--color-muted)' : 'var(--color-body)' }}>
                Vehicle {workOrder.vehicle_id.slice(0, 8)}
              </strong>
            </span>
            <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              📍 Depot
            </span>
            <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              📅 Raised {formatDate(workOrder.raised_at)}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {isCloseable(workOrder.status) && (
            <Button
              variant="secondary"
              style={{ fontSize: 'var(--font-size-small)' }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/work-orders/${workOrder.id}/close`);
              }}
            >
              Close Order
            </Button>
          )}
          <Button
            variant="ghost"
            style={{ fontSize: 'var(--font-size-small)' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/work-orders/${workOrder.id}`);
            }}
          >
            View →
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyWorkOrdersPage(): React.ReactElement {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const { workOrders, isLoading, error, refetch } = useMyWorkOrders();

  const depotName = useMemo(() => {
    if (user && 'depot_name' in user) {
      return (user as { depot_name?: string }).depot_name ?? 'Your Depot';
    }
    return 'Your Depot';
  }, [user]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return workOrders;
    return workOrders.filter((wo) => wo.status === activeFilter);
  }, [workOrders, activeFilter]);

  const counts = useMemo(() => {
    const open = workOrders.filter((wo) => wo.status === 'open').length;
    const in_progress = workOrders.filter((wo) => wo.status === 'in_progress').length;
    const closed = workOrders.filter((wo) => wo.status === 'closed').length;
    return { all: workOrders.length, open, in_progress, closed };
  }, [workOrders]);

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Open', value: 'open', count: counts.open },
    { label: 'In Progress', value: 'in_progress', count: counts.in_progress },
    { label: 'Closed', value: 'closed', count: counts.closed },
  ];

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Page title */}
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-2) 0',
        }}
      >
        My Work Orders
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-6)',
          marginTop: '0',
        }}
      >
        Work orders assigned to you at {depotName}
      </p>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setActiveFilter(btn.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--font-size-small)',
                fontWeight:
                  activeFilter === btn.value
                    ? 'var(--font-weight-semibold)'
                    : 'var(--font-weight-regular)',
                background:
                  activeFilter === btn.value ? 'var(--color-primary)' : 'transparent',
                color:
                  activeFilter === btn.value
                    ? 'var(--color-on-primary)'
                    : 'var(--color-body)',
                border:
                  activeFilter === btn.value
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                minHeight: 'var(--touch-target-min)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {btn.label}
              <span
                style={{
                  background:
                    activeFilter === btn.value
                      ? 'var(--color-primary-dark)'
                      : 'var(--color-surface-raised)',
                  color:
                    activeFilter === btn.value
                      ? 'var(--color-on-primary-dark)'
                      : 'var(--color-on-surface-raised)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-caption)',
                  padding: '2px 8px',
                  marginLeft: 'var(--space-1)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>
        <p
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-muted)',
            whiteSpace: 'nowrap',
            margin: '0',
          }}
        >
          {counts.all} order{counts.all !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div>
          <Alert
            variant="error"
            message="Could not load your work orders. Please try again."
          />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <EmptyState
          title="You have no work orders assigned to you."
          description="Work orders assigned to you by a manager will appear here."
        />
      )}

      {/* Work order cards */}
      {!isLoading && !error && filteredOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredOrders.map((wo) => (
            <WorkOrderRow key={wo.id} workOrder={wo} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          marginTop: 'var(--space-8)',
          paddingTop: 'var(--space-5)',
          borderTop: '1px solid var(--color-border-subtle)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-warning)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
            Open — awaiting start
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-info)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
            In Progress — work underway
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-border-subtle)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
            Closed — completed
          </span>
        </div>
      </div>
    </div>
  );
}
