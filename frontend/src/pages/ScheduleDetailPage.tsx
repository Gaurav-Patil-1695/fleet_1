import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSchedule } from '../services/schedulesService';
import { getVehicleType } from '../services/vehicleTypesService';
import { getErrorMessage } from '../utils/errorUtils';
import { formatDateTime } from '../utils/dateUtils';
import { formatOdometer } from '../utils/odometerUtils';
import { usePermission } from '../hooks/usePermission';
import type { Schedule } from '../types/schedule';
import type { VehicleType } from '../types/vehicleType';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';

function vehicleClassLabel(vehicleClass: string): string {
  switch (vehicleClass) {
    case 'heavy_truck':
      return 'Heavy Truck';
    case 'light_commercial':
      return 'Light Commercial';
    case 'other':
      return 'Other';
    default:
      return vehicleClass;
  }
}

function SkeletonLine({ width = '100%', height = '20px' }: { width?: string; height?: string }): React.ReactElement {
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

export default function ScheduleDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdministrator } = usePermission();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const data = await getSchedule(id);
      setSchedule(data);
      // Fetch vehicle type name separately
      try {
        const vt = await getVehicleType(data.vehicle_type_id);
        setVehicleType(vt);
      } catch {
        // Non-fatal: vehicle type name not available
        setVehicleType(null);
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      // Check for 404
      if (
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('404') ||
        (err as { status?: number })?.status === 404
      ) {
        navigate('/not-found', { replace: true });
        return;
      }
      setError('Unable to load schedule details — please try again.');
      // Try to extract HTTP status code
      const statusMatch = msg.match(/(\d{3})/);
      if (statusMatch) {
        setErrorCode(statusMatch[1]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const scheduleTitle = vehicleType
    ? `${vehicleType.name} — ${vehicleClassLabel(schedule?.vehicle_class ?? '')}`
    : schedule
    ? `Schedule — ${vehicleClassLabel(schedule.vehicle_class)}`
    : 'Schedule Detail';

  const captionStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
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
      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <Link
          to="/schedules"
          style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          Schedules
        </Link>
        <span style={{ color: 'var(--color-ink)' }}>›</span>
        <span style={{ color: 'var(--color-muted)' }}>
          {isLoading ? '…' : scheduleTitle}
        </span>
      </nav>

      {/* Page Title Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0',
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-h1)',
              color: 'var(--color-ink)',
              lineHeight: 'var(--font-line-height-h1)',
            }}
          >
            {isLoading ? (
              <SkeletonLine width="320px" height="32px" />
            ) : (
              scheduleTitle
            )}
          </h1>
          {schedule && !isLoading && (
            <p
              style={{
                margin: 'var(--space-1) 0 0',
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
              }}
            >
              Schedule ID: {schedule.id}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/schedules')}
            style={{ fontSize: 'var(--font-size-small)' }}
          >
            ← Back to Schedules
          </Button>
          {isAdministrator && !isLoading && !error && schedule && (
            <Button
              variant="primary"
              onClick={() => navigate(`/schedules/${id}/edit`)}
              style={{
                background: 'var(--color-primary-dark)',
                color: 'var(--color-on-primary-dark)',
              }}
            >
              ✏️ Edit Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Main Detail Card */}
      <div
        style={{
          boxShadow: 'var(--elevation-1)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <p
            style={{
              margin: '0',
              ...captionStyle,
            }}
          >
            Service Schedule Details
          </p>
          {!isLoading && !error && schedule && (
            <Badge variant={schedule.is_active ? 'success' : 'neutral'}>
              {schedule.is_active ? '✓ Active' : '— Inactive'}
            </Badge>
          )}
          {isLoading && <SkeletonLine width="80px" height="24px" />}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-6)',
                marginBottom: 'var(--space-6)',
              }}
            >
              {['Vehicle Type', 'Vehicle Class', 'KM Interval', 'Month Interval'].map((label) => (
                <div
                  key={label}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
                >
                  <span style={captionStyle}>{label}</span>
                  <SkeletonLine width="70%" height="28px" />
                  <SkeletonLine width="50%" height="16px" />
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                margin: 'var(--space-6) 0',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
              <span style={captionStyle}>Schedule Status</span>
              <SkeletonLine width="240px" height="24px" />
              <SkeletonLine width="100%" height="16px" />
            </div>
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                margin: 'var(--space-6) 0',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              {['Created', 'Last Updated'].map((label) => (
                <div
                  key={label}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
                >
                  <span style={captionStyle}>{label}</span>
                  <SkeletonLine width="160px" height="16px" />
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                justifyContent: 'center',
                marginTop: 'var(--space-6)',
                color: 'var(--color-muted)',
              }}
            >
              <Spinner size="sm" />
              <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
                Loading schedule…
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <Alert variant="error" message={error} />
            {errorCode && (
              <p
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-muted)',
                  margin: '0',
                }}
              >
                HTTP status: {errorCode}
              </p>
            )}
            <div>
              <Button variant="secondary" onClick={loadSchedule}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Success state */}
        {!isLoading && !error && schedule && (
          <>
            {/* Fields Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-6)',
                color: 'var(--color-on-surface)',
              }}
            >
              {/* Vehicle Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>Vehicle Type</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {vehicleType ? vehicleType.name : 'Unknown'}
                </span>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Type ID: {schedule.vehicle_type_id}
                </span>
              </div>

              {/* Vehicle Class */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>Vehicle Class</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {vehicleClassLabel(schedule.vehicle_class)}
                </span>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Standard classification
                </span>
              </div>

              {/* KM Interval */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>KM Interval</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-primary-dark)',
                    lineHeight: 'var(--font-line-height-h2)',
                  }}
                >
                  {schedule.km_interval.toLocaleString()} km
                </span>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Service triggered at distance
                </span>
              </div>

              {/* Month Interval */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>Month Interval</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-primary-dark)',
                    lineHeight: 'var(--font-line-height-h2)',
                  }}
                >
                  {schedule.month_interval} month{schedule.month_interval !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Service triggered by time
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                margin: 'var(--space-6) 0',
              }}
            />

            {/* Status Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={captionStyle}>Schedule Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Badge variant={schedule.is_active ? 'success' : 'neutral'}>
                  {schedule.is_active
                    ? '✓ Active — this schedule is currently enforced'
                    : '— Inactive — this schedule is not currently enforced'}
                </Badge>
              </div>
              <p
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-muted)',
                  margin: '0',
                }}
              >
                Vehicles matching this type and class will be flagged for service when either
                threshold is reached, whichever comes first.
              </p>
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                margin: 'var(--space-6) 0',
              }}
            />

            {/* Timestamps */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>Created</span>
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
                  {formatDateTime(schedule.created_at)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={captionStyle}>Last Updated</span>
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
                  {formatDateTime(schedule.updated_at)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Danger Zone Card — administrator only, shown when schedule loaded */}
      {isAdministrator && !isLoading && !error && schedule && (
        <div
          style={{
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5) var(--space-6)',
            border: '1px solid var(--color-error-light)',
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
          }}
        >
          {deleteError && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert variant="error" message={deleteError} />
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-error)',
                }}
              >
                Delete this schedule
              </p>
              <p
                style={{
                  margin: 'var(--space-1) 0 0',
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-muted)',
                }}
              >
                Permanently removes this service schedule. Vehicles linked to this type will no
                longer have automated service intervals. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (
                  !window.confirm(
                    'Are you sure you want to permanently delete this schedule? This action cannot be undone.'
                  )
                ) {
                  return;
                }
                setIsDeleting(true);
                setDeleteError(null);
                try {
                  const { deleteSchedule } = await import('../services/schedulesService');
                  await deleteSchedule(id!);
                  navigate('/schedules', {
                    state: { toast: { message: 'Schedule deleted.', variant: 'success' } },
                  });
                } catch (err: unknown) {
                  const msg = getErrorMessage(err);
                  setDeleteError(msg || 'Failed to delete schedule. Please try again.');
                } finally {
                  setIsDeleting(false);
                }
              }}
              style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-small)' }}
            >
              {isDeleting ? 'Deleting…' : '🗑 Delete Schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
