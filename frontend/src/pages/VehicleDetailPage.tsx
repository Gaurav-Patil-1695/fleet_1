import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useVehicleReadings } from '../hooks/useReadings';
import { usePermission } from '../hooks/usePermission';
import { listVehicleWorkOrders } from '../services/vehiclesService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import WorkOrderStatusBadge from '../components/workOrder/WorkOrderStatusBadge';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { formatOdometer, isOdometerOverdue, isOdometerDueSoon, kmUntilService } from '../utils/odometerUtils';
import { isOverdue, isDueSoon, relativeDueLabel } from '../utils/dateUtils';
import { getErrorMessage, isNotFoundError } from '../utils/errorUtils';
import type { Vehicle } from '../types/vehicle';
import type { Reading } from '../types/reading';
import type { WorkOrder } from '../types/workOrder';
import type { BadgeVariant } from '../components/ui/Badge';

function useVehicleWorkOrders(vehicleId: string | null | undefined) {
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (!vehicleId) return;
    setIsLoading(true);
    setError(null);
    listVehicleWorkOrders(vehicleId, { status: 'open', page: 1, page_size: 20 })
      .then((res) => {
        setWorkOrders(res.data);
      })
      .catch((err: unknown) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [vehicleId]);

  return { workOrders, isLoading, error };
}

function vehicleStatusBadgeVariant(status: Vehicle['status']): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'decommissioned':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function vehicleStatusLabel(status: Vehicle['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'decommissioned':
      return 'Decommissioned';
    default:
      return status;
  }
}

function readingSourceLabel(source: Reading['source']): string {
  switch (source) {
    case 'telematics':
      return 'Telematics';
    case 'manual':
      return 'Manual';
    case 'telematics_mock':
      return 'Telematics (Mock)';
    default:
      return source;
  }
}

function readingSourceBadgeVariant(source: Reading['source']): BadgeVariant {
  switch (source) {
    case 'telematics':
    case 'telematics_mock':
      return 'info';
    case 'manual':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function SkeletonBlock({ height, width = '100%' }: { height: string; width?: string }): React.ReactElement {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 'var(--radius-sm)',
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
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

function SkeletonCard(): React.ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        boxShadow: 'var(--elevation-1)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
      }}
    >
      <SkeletonBlock height="20px" width="40%" />
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <SkeletonBlock height="16px" />
        <SkeletonBlock height="16px" />
        <SkeletonBlock height="16px" width="80%" />
        <SkeletonBlock height="16px" width="60%" />
      </div>
    </div>
  );
}

export default function VehicleDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess } = usePermission();

  const { vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(id ?? null);
  const {
    workOrders,
    isLoading: workOrdersLoading,
    error: workOrdersError,
  } = useVehicleWorkOrders(id);
  const {
    readings,
    isLoading: readingsLoading,
  } = useVehicleReadings({ vehicleId: id ?? '', page: 1, page_size: 5 });

  const isLoading = vehicleLoading || workOrdersLoading || readingsLoading;

  const canEditVehicle = canAccess(['administrator', 'manager']);
  const canRecordOdometer = canAccess(['administrator', 'manager']);
  const canRaiseWorkOrder = canAccess(['administrator', 'manager']);

  if (vehicleLoading) {
    return (
      <div
        style={{
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: 'var(--space-6)',
        }}
      >
        {/* Breadcrumb skeleton */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SkeletonBlock height="24px" width="200px" />
        </div>
        {/* Two-column skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-5)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SkeletonCard />
        </div>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (vehicleError) {
    const notFound = isNotFoundError(vehicleError);
    const message = notFound
      ? 'This vehicle does not exist.'
      : 'Vehicle record could not be loaded.';
    return (
      <div
        style={{
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: 'var(--space-6)',
        }}
      >
        <div
          style={{
            background: 'var(--color-error)',
            color: 'var(--color-on-error)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5) var(--space-6)',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-h2)' }}>✕</span>
          <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-semibold)' }}>
            {message}
          </span>
        </div>
        <Button variant="ghost" onClick={() => navigate('/vehicles')}>
          ← Back to vehicles
        </Button>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div
        style={{
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: 'var(--space-6)',
        }}
      >
        <Alert variant="error" message="Vehicle record could not be loaded." />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => navigate('/vehicles')}>
            ← Back to vehicles
          </Button>
        </div>
      </div>
    );
  }

  const dateOverdue = isOverdue(vehicle.next_service_due_date);
  const dateDueSoon = !dateOverdue && isDueSoon(vehicle.next_service_due_date, 30);
  const odometerOverdue =
    vehicle.next_service_due_odometer_km != null && vehicle.last_known_odometer_km != null
      ? isOdometerOverdue(vehicle.last_known_odometer_km, vehicle.next_service_due_odometer_km)
      : false;
  const odometerDueSoon =
    !odometerOverdue &&
    vehicle.next_service_due_odometer_km != null &&
    vehicle.last_known_odometer_km != null
      ? isOdometerDueSoon(vehicle.last_known_odometer_km, vehicle.next_service_due_odometer_km, 2000)
      : false;

  const kmRemaining =
    vehicle.next_service_due_odometer_km != null && vehicle.last_known_odometer_km != null
      ? kmUntilService(vehicle.last_known_odometer_km, vehicle.next_service_due_odometer_km)
      : null;

  function datePanelStyle(): React.CSSProperties {
    if (dateOverdue) {
      return {
        flex: 1,
        background: 'var(--color-error-light)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3)',
        borderLeft: '3px solid var(--color-error)',
        color: 'var(--color-ink)',
      };
    }
    if (dateDueSoon) {
      return {
        flex: 1,
        background: 'var(--color-warning-light)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3)',
        borderLeft: '3px solid var(--color-warning)',
        color: 'var(--color-ink)',
      };
    }
    return {
      flex: 1,
      background: 'var(--color-surface-raised)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-3)',
      borderLeft: '3px solid var(--color-border)',
      color: 'var(--color-on-surface-raised)',
    };
  }

  function odometerPanelStyle(): React.CSSProperties {
    if (odometerOverdue) {
      return {
        flex: 1,
        background: 'var(--color-error-light)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3)',
        borderLeft: '3px solid var(--color-error)',
        color: 'var(--color-ink)',
      };
    }
    if (odometerDueSoon) {
      return {
        flex: 1,
        background: 'var(--color-warning-light)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3)',
        borderLeft: '3px solid var(--color-warning)',
        color: 'var(--color-ink)',
      };
    }
    return {
      flex: 1,
      background: 'var(--color-surface-raised)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-3)',
      borderLeft: '3px solid var(--color-border)',
      color: 'var(--color-on-surface-raised)',
    };
  }

  function dateStatusIcon(): string {
    if (dateOverdue) return '✕';
    if (dateDueSoon) return '⚠';
    return '';
  }

  function odometerStatusIcon(): string {
    if (odometerOverdue) return '✕';
    if (odometerDueSoon) return '⚠';
    return '';
  }

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Breadcrumb / Page Title */}
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-2) 0',
          lineHeight: 'var(--font-line-height-h1)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => navigate('/vehicles')}
            style={{
              background: 'none',
              border: 'none',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Vehicles
          </button>
          <span style={{ color: 'var(--color-ink)' }}>/</span>
          <span>{vehicle.registration_number}</span>
        </span>
      </h1>

      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Badge variant={vehicleStatusBadgeVariant(vehicle.status)}>
            {vehicleStatusLabel(vehicle.status)}
          </Badge>
          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
            Last updated {formatDateTime(vehicle.updated_at)}
          </span>
        </div>
        {canEditVehicle && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="ghost"
              onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              style={{ fontSize: 'var(--font-size-small)' }}
            >
              Edit vehicle
            </Button>
          </div>
        )}
      </div>

      {/* Two-column grid: Vehicle Info + Service Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {/* Vehicle Information Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-h3)',
              fontWeight: 'var(--font-weight-h3)',
              color: 'var(--color-ink)',
              margin: '0 0 var(--space-4) 0',
            }}
          >
            Vehicle information
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <InfoRow label="Registration">
                <span
                  style={{
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-ink)',
                    fontSize: 'var(--font-size-small)',
                  }}
                >
                  {vehicle.registration_number}
                </span>
              </InfoRow>
              <InfoRow label="Make">
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                  {vehicle.make}
                </span>
              </InfoRow>
              <InfoRow label="Model">
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                  {vehicle.model}
                </span>
              </InfoRow>
              <InfoRow label="Vehicle type">
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                  {vehicle.vehicle_type_id}
                </span>
              </InfoRow>
              <InfoRow label="Depot">
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                  {vehicle.depot_id}
                </span>
              </InfoRow>
              <InfoRow label="In service date">
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-body)' }}>
                  {formatDate(vehicle.in_service_date)}
                </span>
              </InfoRow>
              <InfoRow label="Status">
                <Badge variant={vehicleStatusBadgeVariant(vehicle.status)}>
                  {vehicleStatusLabel(vehicle.status)}
                </Badge>
              </InfoRow>
              <InfoRow label="Telematics" isLast>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    fontSize: 'var(--font-size-small)',
                    color: 'var(--color-body)',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: 'var(--radius-full)',
                      background: vehicle.has_telematics
                        ? 'var(--color-success)'
                        : 'var(--color-disabled)',
                      display: 'inline-block',
                    }}
                  />
                  {vehicle.has_telematics ? 'Fitted' : 'Not fitted'}
                </span>
              </InfoRow>
            </tbody>
          </table>
        </div>

        {/* Service Status Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-h3)',
                fontWeight: 'var(--font-weight-h3)',
                color: 'var(--color-ink)',
                margin: '0',
              }}
            >
              Service status
            </h2>
            {canRecordOdometer && (
              <Button
                variant="primary"
                onClick={() => navigate(`/vehicles/${vehicle.id}/readings/new`)}
                style={{ fontSize: 'var(--font-size-small)', padding: 'var(--space-2) var(--space-3)' }}
              >
                Record odometer
              </Button>
            )}
          </div>

          {/* Current Odometer */}
          <div
            style={{
              background: 'var(--color-canvas)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-on-canvas)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Last known odometer
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-h1)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              {vehicle.last_known_odometer_km != null
                ? formatOdometer(vehicle.last_known_odometer_km)
                : '—'}
            </div>
            {vehicle.last_odometer_recorded_at && (
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-muted)',
                  marginTop: 'var(--space-1)',
                }}
              >
                Recorded {formatDate(vehicle.last_odometer_recorded_at)}
                {readings.length > 0 && readings[0].source
                  ? ` · ${readingSourceLabel(readings[0].source)}`
                  : ''}
              </div>
            )}
          </div>

          {/* Next Service Due */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Next service due
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              {/* By date panel */}
              <div style={datePanelStyle()}>
                {(dateOverdue || dateDueSoon) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink)' }}>
                      {dateStatusIcon()}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      By date
                    </span>
                  </div>
                )}
                {!dateOverdue && !dateDueSoon && (
                  <div
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-ink)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    By date
                  </div>
                )}
                <div
                  style={{
                    fontSize: 'var(--font-size-small)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {vehicle.next_service_due_date
                    ? formatDate(vehicle.next_service_due_date)
                    : '—'}
                </div>
                {vehicle.next_service_due_date && (
                  <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                    {relativeDueLabel(vehicle.next_service_due_date)}
                  </div>
                )}
              </div>

              {/* By odometer panel */}
              <div style={odometerPanelStyle()}>
                {(odometerOverdue || odometerDueSoon) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink)' }}>
                      {odometerStatusIcon()}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      By odometer
                    </span>
                  </div>
                )}
                {!odometerOverdue && !odometerDueSoon && (
                  <div
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-ink)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    By odometer
                  </div>
                )}
                <div
                  style={{
                    fontSize: 'var(--font-size-small)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {vehicle.next_service_due_odometer_km != null
                    ? formatOdometer(vehicle.next_service_due_odometer_km)
                    : '—'}
                </div>
                {kmRemaining != null && (
                  <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                    {kmRemaining > 0
                      ? `${formatOdometer(kmRemaining).replace(' km', '')} km remaining`
                      : `${formatOdometer(Math.abs(kmRemaining)).replace(' km', '')} km overdue`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Open Work Orders Panel */}
      <div
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface)',
          boxShadow: 'var(--elevation-1)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-h3)',
                fontWeight: 'var(--font-weight-h3)',
                color: 'var(--color-ink)',
                margin: '0 0 var(--space-1) 0',
              }}
            >
              Open work orders
            </h2>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-muted)',
              }}
            >
              {workOrdersLoading
                ? 'Loading…'
                : `${workOrders.length} open · filtered to this vehicle`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="ghost"
              onClick={() => navigate('/work-orders')}
              style={{ fontSize: 'var(--font-size-small)' }}
            >
              View all work orders
            </Button>
            {canRaiseWorkOrder && (
              <Button
                variant="primary"
                onClick={() => navigate(`/work-orders/new?vehicleId=${vehicle.id}`)}
                style={{ fontSize: 'var(--font-size-small)' }}
              >
                Raise work order
              </Button>
            )}
          </div>
        </div>

        {workOrdersLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <SkeletonBlock height="40px" />
            <SkeletonBlock height="40px" />
          </div>
        ) : workOrders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--color-muted)',
              fontSize: 'var(--font-size-small)',
            }}
          >
            No open work orders for this vehicle.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '560px',
                color: 'var(--color-on-surface)',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-canvas)' }}>
                  {['Ref', 'Description', 'Raised', 'Status', ''].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: col === '' ? 'right' : 'left',
                        padding: 'var(--space-2) var(--space-3)',
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--font-letter-spacing-caps)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo, idx) => (
                  <tr
                    key={wo.id}
                    style={{
                      borderBottom:
                        idx < workOrders.length - 1
                          ? '1px solid var(--color-border-subtle)'
                          : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                  >
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        fontFamily: 'var(--font-family-mono)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {wo.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-body)',
                      }}
                    >
                      {wo.description ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(wo.raised_at)}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <WorkOrderStatusBadge status={wo.status} />
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/work-orders/${wo.id}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 'var(--font-size-small)',
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: 'var(--space-1) var(--space-2)',
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Odometer Readings Panel */}
      <div
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface)',
          boxShadow: 'var(--elevation-1)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-h3)',
                fontWeight: 'var(--font-weight-h3)',
                color: 'var(--color-ink)',
                margin: '0 0 var(--space-1) 0',
              }}
            >
              Odometer readings
            </h2>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
              Most recent 5 entries shown
            </span>
          </div>
          {canRecordOdometer && (
            <Button
              variant="ghost"
              onClick={() => navigate(`/vehicles/${vehicle.id}/readings/new`)}
              style={{ fontSize: 'var(--font-size-small)' }}
            >
              Record new reading
            </Button>
          )}
        </div>

        {readingsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <SkeletonBlock height="40px" />
            <SkeletonBlock height="40px" />
            <SkeletonBlock height="40px" />
          </div>
        ) : readings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--color-muted)',
              fontSize: 'var(--font-size-small)',
            }}
          >
            No odometer readings recorded for this vehicle.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '400px',
                color: 'var(--color-on-surface)',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-canvas)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    Reading (km)
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    Source
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    Recorded by
                  </th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading, idx) => (
                  <tr
                    key={reading.id}
                    style={{
                      borderBottom:
                        idx < readings.length - 1
                          ? '1px solid var(--color-border-subtle)'
                          : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-body)',
                      }}
                    >
                      {formatDate(reading.reading_timestamp)}
                    </td>
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        fontFamily: 'var(--font-family-mono)',
                        textAlign: 'right',
                        color: 'var(--color-ink)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      {reading.odometer_km.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <Badge variant={readingSourceBadgeVariant(reading.source)}>
                        {readingSourceLabel(reading.source)}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                        textAlign: 'right',
                      }}
                    >
                      {reading.recorded_by_user_id ? reading.recorded_by_user_id.substring(0, 8) : 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}

function InfoRow({ label, children, isLast = false }: InfoRowProps): React.ReactElement {
  return (
    <tr
      style={{
        borderBottom: isLast ? undefined : '1px solid var(--color-border-subtle)',
      }}
    >
      <td
        style={{
          padding: 'var(--space-2) var(--space-3) var(--space-2) 0',
          color: 'var(--color-muted)',
          fontSize: 'var(--font-size-small)',
          whiteSpace: 'nowrap',
          width: '45%',
          verticalAlign: 'middle',
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: 'var(--space-2) 0',
          verticalAlign: 'middle',
        }}
      >
        {children}
      </td>
    </tr>
  );
}
