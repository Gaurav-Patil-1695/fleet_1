import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkOrders } from '../hooks/useWorkOrders';
import { usePermission } from '../hooks/usePermission';
import { formatDate } from '../utils/dateUtils';
import WorkOrderStatusBadge from '../components/workOrder/WorkOrderStatusBadge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import type { WorkOrderStatus } from '../types/workOrder';

type StatusFilter = 'all' | WorkOrderStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Closed', value: 'closed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 10;

export default function WorkOrderListPage(): React.ReactElement {
  const navigate = useNavigate();
  const { canAccess } = usePermission();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [depotFilter, setDepotFilter] = useState('');
  const [page, setPage] = useState(1);

  const workOrdersParams = {
    page,
    page_size: PAGE_SIZE,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { workOrders, pagination, isLoading, error, refetch } = useWorkOrders(workOrdersParams);

  const canCreate = canAccess(['administrator', 'manager']);

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const reg = (wo as unknown as Record<string, string>).registration_number ?? '';
    const id = wo.id ?? '';
    const tech = (wo as unknown as Record<string, string>).assigned_technician_name ?? '';
    return (
      id.toLowerCase().includes(q) ||
      reg.toLowerCase().includes(q) ||
      tech.toLowerCase().includes(q)
    );
  });

  function handleStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleRowClick(id: string) {
    navigate(`/work-orders/${id}`);
  }

  function getRowBackground(status: WorkOrderStatus): string {
    if (status === 'in_progress') return 'var(--color-info-light)';
    return 'var(--color-white)';
  }

  function getRowHoverBackground(status: WorkOrderStatus): string {
    if (status === 'in_progress') return 'var(--color-teal-40)';
    return 'var(--color-canvas)';
  }

  function getRowOpacity(status: WorkOrderStatus): number {
    if (status === 'closed') return 0.8;
    if (status === 'cancelled') return 0.7;
    return 1;
  }

  const totalPages = pagination?.total_pages ?? 1;
  const totalItems = pagination?.total_items ?? filteredWorkOrders.length;

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    color: 'var(--color-muted)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-6) 0',
        }}
      >
        Work Orders
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Toolbar: filters + action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          {/* Status filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-1)',
              background: 'var(--color-surface-raised)',
              padding: 'var(--space-1)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              color: 'var(--color-on-surface-raised)',
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--font-size-small)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight:
                    statusFilter === f.value
                      ? 'var(--font-weight-semibold)'
                      : 'var(--font-weight-regular)',
                  background:
                    statusFilter === f.value
                      ? 'var(--color-primary)'
                      : 'transparent',
                  color:
                    statusFilter === f.value
                      ? 'var(--color-on-primary)'
                      : 'var(--color-body)',
                  transition: 'background 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Create Work Order CTA */}
          {canCreate && (
            <Button
              variant="primary"
              onClick={() => navigate('/work-orders/new')}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <span style={{ fontSize: '18px', lineHeight: '1' }}>&#65291;</span> Create Work Order
            </Button>
          )}
        </div>

        {/* Search row */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ margin: 0, flex: 1, minWidth: '200px', maxWidth: '380px' }}>
            <label
              htmlFor="work-order-list-wo-search"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Search work orders
            </label>
            <input
              id="work-order-list-wo-search"
              type="search"
              placeholder="Vehicle reg, WO reference, technician…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                minHeight: 'var(--touch-target-min)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ margin: 0, minWidth: '160px' }}>
            <label
              htmlFor="work-order-list-wo-depot"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Depot
            </label>
            <select
              id="work-order-list-wo-depot"
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                minHeight: 'var(--touch-target-min)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All depots</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              margin: 0,
            }}
          >
            {isLoading ? (
              'Loading…'
            ) : (
              <>
                Showing{' '}
                <strong style={{ color: 'var(--color-body)' }}>
                  {filteredWorkOrders.length}
                </strong>{' '}
                work order{filteredWorkOrders.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>

        {/* Loading state: skeleton rows */}
        {isLoading && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--elevation-2)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--color-surface-raised)',
                    borderBottom: '2px solid var(--color-border-subtle)',
                    color: 'var(--color-on-surface-raised)',
                  }}
                >
                  <th style={thStyle}>WO Reference</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Assigned Technician</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Raised</th>
                  <th style={thStyle}>Depot</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                      <td
                        key={j}
                        style={{ padding: 'var(--space-3) var(--space-4)' }}
                      >
                        <div
                          style={{
                            height: '16px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--color-surface-raised)',
                            width: j === 0 ? '90px' : j === 1 ? '120px' : '80px',
                            position: 'relative',
                            overflow: 'hidden',
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
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div>
            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--elevation-2)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--color-surface-raised)',
                      borderBottom: '2px solid var(--color-border-subtle)',
                      color: 'var(--color-on-surface-raised)',
                    }}
                  >
                    <th style={thStyle}>WO Reference</th>
                    <th style={thStyle}>Vehicle</th>
                    <th style={thStyle}>Assigned Technician</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Raised</th>
                    <th style={thStyle}>Depot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 'var(--space-8) var(--space-4)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <Alert
                          variant="error"
                          message="Could not load work orders. Please try again."
                        />
                      </div>
                      <Button variant="secondary" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success state: work orders table */}
        {!isLoading && !error && (
          <div
            style={{
              padding: 0,
              overflowX: 'auto',
              boxShadow: 'var(--elevation-2)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '680px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--color-surface-raised)',
                    borderBottom: '2px solid var(--color-border-subtle)',
                    color: 'var(--color-on-surface-raised)',
                  }}
                >
                  <th style={thStyle}>WO Reference</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Assigned Technician</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Raised</th>
                  <th style={thStyle}>Depot</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 'var(--space-12) var(--space-4)',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 'var(--space-4)',
                          color: 'var(--color-muted)',
                        }}
                      >
                        <span style={{ fontSize: '2rem' }}>📋</span>
                        <p
                          style={{
                            fontSize: 'var(--font-size-body)',
                            margin: 0,
                            color: 'var(--color-muted)',
                          }}
                        >
                          No work orders found.
                        </p>
                        {canCreate && (
                          <Button
                            variant="primary"
                            onClick={() => navigate('/work-orders/new')}
                          >
                            Create Work Order
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => {
                    const status = wo.status as WorkOrderStatus;
                    const rowBg = getRowBackground(status);
                    const rowHoverBg = getRowHoverBackground(status);
                    const opacity = getRowOpacity(status);
                    const isActive = status === 'open' || status === 'in_progress';

                    const woRef = `#WO-${wo.id.slice(0, 8).toUpperCase()}`;
                    const vehicleReg =
                      (wo as unknown as Record<string, string>).registration_number ?? '—';
                    const vehicleMakeModel =
                      (wo as unknown as Record<string, string>).vehicle_make_model ?? null;
                    const techName =
                      (wo as unknown as Record<string, string>).assigned_technician_name ?? null;
                    const depotName =
                      (wo as unknown as Record<string, string>).depot_name ?? '—';

                    return (
                      <WorkOrderRow
                        key={wo.id}
                        woRef={woRef}
                        vehicleReg={vehicleReg}
                        vehicleMakeModel={vehicleMakeModel}
                        techName={techName}
                        status={status}
                        raisedAt={wo.raised_at}
                        depotName={depotName}
                        isActive={isActive}
                        rowBg={rowBg}
                        rowHoverBg={rowHoverBg}
                        opacity={opacity}
                        onClick={() => handleRowClick(wo.id)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && filteredWorkOrders.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                margin: 0,
              }}
            >
              Page {page} of {totalPages}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--font-size-small)',
                  background: 'transparent',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? 'var(--color-disabled)' : 'var(--color-body)',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--font-size-small)',
                    background:
                      page === p ? 'var(--color-primary)' : 'transparent',
                    border:
                      page === p
                        ? '1px solid var(--color-primary)'
                        : '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color:
                      page === p ? 'var(--color-on-primary)' : 'var(--color-body)',
                    fontWeight:
                      page === p
                        ? 'var(--font-weight-semibold)'
                        : 'var(--font-weight-regular)',
                  }}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--font-size-small)',
                  background: 'transparent',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  color:
                    page >= totalPages ? 'var(--color-disabled)' : 'var(--color-body)',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Status legend */}
        <div
          style={{
            background: 'var(--color-surface-raised)',
            boxShadow: 'none',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-surface-raised)',
          }}
        >
          <p
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: '0 0 var(--space-3) 0',
            }}
          >
            STATUS KEY
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-5)',
              flexWrap: 'wrap',
              color: 'var(--color-on-surface-raised)',
            }}
          >
            <LegendItem icon="🔴" label="Open" description="Raised, awaiting assignment" badgeColor="var(--color-error-light)" badgeText="var(--color-ink)" />
            <LegendItem icon="🔵" label="In Progress" description="Technician assigned and working" badgeColor="var(--color-info-light)" badgeText="var(--color-ink)" />
            <LegendItem icon="✅" label="Closed" description="Work completed and signed off" badgeColor="var(--color-success-light)" badgeText="var(--color-ink)" />
            <LegendItem icon="⛔" label="Cancelled" description="Order voided before completion" badgeColor="var(--color-warm-grey-60)" badgeText="var(--color-body)" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkOrderRowProps {
  woRef: string;
  vehicleReg: string;
  vehicleMakeModel: string | null;
  techName: string | null;
  status: WorkOrderStatus;
  raisedAt: string;
  depotName: string;
  isActive: boolean;
  rowBg: string;
  rowHoverBg: string;
  opacity: number;
  onClick: () => void;
}

function WorkOrderRow({
  woRef,
  vehicleReg,
  vehicleMakeModel,
  techName,
  status,
  raisedAt,
  depotName,
  isActive,
  rowBg,
  rowHoverBg,
  opacity,
  onClick,
}: WorkOrderRowProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: hovered ? rowHoverBg : rowBg,
        color: 'var(--color-ink)',
        opacity,
        transition: 'background 0.12s',
      }}
    >
      {/* WO Reference */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink)' }}>
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: 'var(--font-size-small)',
            fontWeight: isActive
              ? 'var(--font-weight-semibold)'
              : 'var(--font-weight-medium)',
            color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          {woRef}
        </span>
      </td>

      {/* Vehicle */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink)' }}>
        <div
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: isActive
              ? 'var(--font-weight-semibold)'
              : 'var(--font-weight-regular)',
            color: 'var(--color-body)',
          }}
        >
          {vehicleReg}
        </div>
        {vehicleMakeModel && (
          <div
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-muted)',
            }}
          >
            {vehicleMakeModel}
          </div>
        )}
      </td>

      {/* Assigned Technician */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink)' }}>
        {techName ? (
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-body)',
            }}
          >
            {techName}
          </div>
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
      </td>

      {/* Status */}
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-ink)' }}>
        <WorkOrderStatusBadge status={status} />
      </td>

      {/* Raised */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-body)',
        }}
      >
        {formatDate(raisedAt)}
      </td>

      {/* Depot */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-body)',
        }}
      >
        {depotName}
      </td>
    </tr>
  );
}

interface LegendItemProps {
  icon: string;
  label: string;
  description: string;
  badgeColor: string;
  badgeText: string;
}

function LegendItem({
  icon,
  label,
  description,
  badgeColor,
  badgeText,
}: LegendItemProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        alignItems: 'center',
        color: 'var(--color-on-surface-raised)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: '2px var(--space-2)',
          borderRadius: 'var(--radius-full)',
          background: badgeColor,
          color: badgeText,
          fontSize: 'var(--font-size-caption)',
          fontWeight: 'var(--font-weight-medium)',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{icon}</span> {label}
      </span>
      <span
        style={{
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-muted)',
        }}
      >
        {description}
      </span>
    </div>
  );
}
