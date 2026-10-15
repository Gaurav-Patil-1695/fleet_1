import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getWorkOrder, assignWorkOrder } from '../services/workOrdersService';
import { getErrorMessage } from '../utils/errorUtils';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import type { WorkOrder } from '../types/workOrder';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import WorkOrderStatusBadge from '../components/workOrder/WorkOrderStatusBadge';
import AssignTechnicianField from '../components/workOrder/AssignTechnicianField';
import { formatOdometer } from '../utils/odometerUtils';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function SkeletonBlock({ width = '100%', height = '20px' }: { width?: string; height?: string }): React.ReactElement {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 'var(--radius-xs)',
        background: 'var(--color-surface-raised)',
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
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function SkeletonCard(): React.ReactElement {
  return (
    <div
      style={{
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--elevation-1)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <SkeletonBlock height="14px" width="120px" />
      <SkeletonBlock height="20px" />
      <SkeletonBlock height="20px" width="75%" />
    </div>
  );
}

export default function WorkOrderDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRole } = usePermission();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Assign technician state
  const [assignTechId, setAssignTechId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignFieldError, setAssignFieldError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const isAdministrator = isRole('administrator');
  const isManager = isRole('manager');
  const isTechnician = isRole('technician');

  const canAssign = isAdministrator || isManager;

  const loadWorkOrder = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);
    try {
      const wo = await getWorkOrder(id);
      setWorkOrder(wo);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (
        msg.toLowerCase().includes('404') ||
        msg.toLowerCase().includes('not found')
      ) {
        setIsNotFound(true);
      } else {
        setError('Work order could not be loaded.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkOrder();
  }, [loadWorkOrder]);

  const isClosed = workOrder?.status === 'closed' || workOrder?.status === 'cancelled';
  const isOpen = workOrder?.status === 'open' || workOrder?.status === 'in_progress';

  const isAssignedTechnician =
    isTechnician && user && workOrder?.assigned_technician_id === (user as { id?: string }).id;

  const canClose =
    isOpen &&
    (isAdministrator || isManager || isAssignedTechnician);

  const canDelete = isAdministrator && isOpen;

  function handleAssignTechChange(value: string) {
    setAssignTechId(value);
    setAssignFieldError(null);
    setAssignError(null);
    setAssignSuccess(false);
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAssignFieldError(null);
    setAssignError(null);
    setAssignSuccess(false);

    if (!assignTechId || !UUID_RE.test(assignTechId)) {
      setAssignFieldError('Technician ID must be a valid UUID.');
      return;
    }

    if (!id) return;
    setIsAssigning(true);
    try {
      const updated = await assignWorkOrder(id, { assigned_technician_id: assignTechId });
      setWorkOrder(updated);
      setAssignSuccess(true);
      setAssignTechId('');
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setAssignError(msg || 'Failed to assign technician. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    marginBottom: 'var(--space-4)',
    color: 'var(--color-muted)',
    fontSize: 'var(--font-size-caption)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase',
    fontWeight: 'var(--font-weight-semibold)',
  };

  const cardStyle: React.CSSProperties = {
    padding: 'var(--space-5)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--elevation-1)',
    background: 'var(--color-surface)',
    color: 'var(--color-on-surface)',
  };

  const rowBetween: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: 'var(--color-on-surface)',
  };

  const labelSmall: React.CSSProperties = {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-muted)',
  };

  const valueSmall: React.CSSProperties = {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-body)',
    fontWeight: 'var(--font-weight-medium)',
  };

  const hrStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid var(--color-border-subtle)',
    margin: '0',
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
        Work Order Detail
      </h1>

      {/* Breadcrumb / back nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/work-orders')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          Back to Work Orders
        </Button>
        {workOrder && (
          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
            / {workOrder.id.slice(0, 8).toUpperCase()}
          </span>
        )}
        {isLoading && (
          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
            / Loading…
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
            maxWidth: 'var(--content-max-width)',
          }}
        >
          {/* Header skeleton */}
          <div
            style={{
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--elevation-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <SkeletonBlock height="14px" width="80px" />
            <SkeletonBlock height="32px" width="220px" />
            <SkeletonBlock height="16px" width="300px" />
          </div>

          {/* Two column skeleton */}
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 2, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      )}

      {/* Error / Not found state */}
      {!isLoading && (error || isNotFound) && (
        <div
          style={{
            maxWidth: 'var(--content-max-width)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <Alert
            variant="error"
            message={
              isNotFound
                ? 'This work order does not exist.'
                : 'Work order could not be loaded.'
            }
          />
          <div>
            <Button variant="ghost" onClick={() => navigate('/work-orders')}>
              &larr; Back to Work Orders
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {!isLoading && !error && !isNotFound && workOrder && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
            maxWidth: 'var(--content-max-width)',
          }}
        >
          {/* Header summary card */}
          <div
            style={{
              background: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary-dark)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elevation-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-4)',
                color: 'var(--color-on-primary-dark)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 'var(--font-weight-semibold)',
                    letterSpacing: 'var(--font-letter-spacing-caps)',
                    color: 'var(--color-on-primary-dark)',
                    textTransform: 'uppercase',
                  }}
                >
                  Reference
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-h1)',
                    fontWeight: 'var(--font-weight-h1)',
                    color: 'var(--color-on-primary-dark)',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                >
                  WO-{workOrder.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-on-primary-dark)' }}>
                  Raised {formatDateTime(workOrder.raised_at)}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                <WorkOrderStatusBadge status={workOrder.status} />

                {canClose && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/work-orders/${workOrder.id}/close`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Close Work Order
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-6)',
              flexWrap: 'wrap',
            }}
          >
            {/* Left column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-5)',
                flex: 2,
                minWidth: '280px',
              }}
            >
              {/* Description Card */}
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Description</div>
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--color-body)',
                    lineHeight: 'var(--font-line-height-body)',
                    margin: '0',
                  }}
                >
                  {workOrder.description || (
                    <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                      No description provided.
                    </span>
                  )}
                </p>
              </div>

              {/* Vehicle Card */}
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Vehicle</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    flexWrap: 'wrap',
                    color: 'var(--color-on-surface)',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--color-surface-raised)',
                      borderRadius: 'var(--radius-md)',
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="1.5"
                    >
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                      flex: 1,
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--font-size-h3)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      <Link
                        to={`/vehicles/${workOrder.vehicle_id}`}
                        style={{
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          fontWeight: 'var(--font-weight-semibold)',
                        }}
                      >
                        Vehicle {workOrder.vehicle_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                      ID: {workOrder.vehicle_id}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
                      Depot ID: {workOrder.depot_id}
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Details Card */}
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Completion Details</div>

                {isClosed && workOrder.completion_notes ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-4)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--color-muted)',
                          fontWeight: 'var(--font-weight-semibold)',
                          textTransform: 'uppercase',
                          letterSpacing: 'var(--font-letter-spacing-caps)',
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        Completion Notes
                      </div>
                      <p
                        style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--color-body)',
                          lineHeight: 'var(--font-line-height-body)',
                          margin: '0',
                        }}
                      >
                        {workOrder.completion_notes}
                      </p>
                    </div>

                    {workOrder.post_service_odometer_km != null && (
                      <div style={rowBetween}>
                        <span style={labelSmall}>Post-service odometer</span>
                        <span style={valueSmall}>
                          {formatOdometer(workOrder.post_service_odometer_km)}
                        </span>
                      </div>
                    )}

                    {workOrder.closed_by_user_id && (
                      <div style={rowBetween}>
                        <span style={labelSmall}>Closed by</span>
                        <span style={valueSmall}>{workOrder.closed_by_user_id}</span>
                      </div>
                    )}

                    {workOrder.closed_at && (
                      <div style={rowBetween}>
                        <span style={labelSmall}>Closed at</span>
                        <span style={valueSmall}>{formatDateTime(workOrder.closed_at)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'var(--color-canvas)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-4)',
                      textAlign: 'center',
                      color: 'var(--color-on-canvas)',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-muted)"
                      strokeWidth="1.5"
                      style={{ marginBottom: 'var(--space-2)' }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p
                      style={{
                        margin: '0',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      Completion details will appear here once the work order is closed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-5)',
                flex: 1,
                minWidth: '240px',
              }}
            >
              {/* Status Card */}
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Status</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    color: 'var(--color-on-surface)',
                  }}
                >
                  <div style={rowBetween}>
                    <span style={labelSmall}>Current status</span>
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </div>

                  <hr style={hrStyle} />

                  <div style={rowBetween}>
                    <span style={labelSmall}>Raised</span>
                    <span style={valueSmall}>{formatDate(workOrder.raised_at)}</span>
                  </div>

                  <div style={rowBetween}>
                    <span style={labelSmall}>Raised by</span>
                    <span style={valueSmall}>
                      {workOrder.raised_by_user_id
                        ? workOrder.raised_by_user_id.slice(0, 8).toUpperCase()
                        : '—'}
                    </span>
                  </div>

                  <div style={rowBetween}>
                    <span style={labelSmall}>Depot</span>
                    <span style={valueSmall}>
                      {workOrder.depot_id
                        ? workOrder.depot_id.slice(0, 8).toUpperCase()
                        : '—'}
                    </span>
                  </div>

                  {workOrder.closed_at && (
                    <div style={rowBetween}>
                      <span style={labelSmall}>Closed</span>
                      <span style={valueSmall}>{formatDate(workOrder.closed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Card — only for manager/administrator */}
              {canAssign && (
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-4)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <div style={{ ...sectionLabelStyle, margin: 0 }}>Assignment</div>
                  </div>

                  {/* Current assignment display */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      marginBottom: 'var(--space-4)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--color-on-primary-light)',
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-small)',
                      }}
                    >
                      {workOrder.assigned_technician_id
                        ? workOrder.assigned_technician_id.slice(0, 2).toUpperCase()
                        : 'UN'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 'var(--font-size-small)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {workOrder.assigned_technician_id
                          ? `Technician ${workOrder.assigned_technician_id.slice(0, 8).toUpperCase()}`
                          : 'Unassigned'}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--color-muted)',
                        }}
                      >
                        {workOrder.assigned_technician_id ? 'Assigned Technician' : 'No technician assigned'}
                      </div>
                    </div>
                  </div>

                  {/* Assign/Reassign form */}
                  {isOpen && (
                    <form onSubmit={handleAssignSubmit} noValidate>
                      {assignError && (
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                          <Alert variant="error" message={assignError} />
                        </div>
                      )}
                      {assignSuccess && (
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                          <Alert variant="success" message="Technician assigned successfully." />
                        </div>
                      )}

                      <AssignTechnicianField
                        depotId={workOrder.depot_id}
                        value={assignTechId}
                        onChange={handleAssignTechChange}
                        error={assignFieldError ?? undefined}
                        disabled={isAssigning}
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isAssigning || !assignTechId}
                        style={{ width: '100%', marginTop: 'var(--space-2)' }}
                      >
                        {isAssigning ? 'Assigning…' : 'Confirm Assignment'}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Actions Card */}
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Actions</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    color: 'var(--color-on-surface)',
                  }}
                >
                  {canClose && (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/work-orders/${workOrder.id}/close`)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Close Work Order
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/vehicles/${workOrder.vehicle_id}`)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    View Vehicle
                  </Button>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        // Delete action — out of scope for inline handling, navigate to list
                        navigate('/work-orders');
                      }}
                      style={{
                        width: '100%',
                        color: 'var(--color-error)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                      Delete Work Order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
