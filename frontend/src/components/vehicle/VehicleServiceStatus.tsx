import React from 'react';
import { Vehicle } from '../../types/vehicle';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/dateUtils';
import { formatOdometer, isOdometerOverdue, isOdometerDueSoon, kmUntilService } from '../../utils/odometerUtils';
import { isOverdue, isDueSoon, relativeDueLabel } from '../../utils/dateUtils';

export interface VehicleServiceStatusProps {
  vehicle: Vehicle;
}

type ServiceStatusLevel = 'overdue' | 'due_soon' | 'ok' | 'unknown';

function getServiceStatusLevel(vehicle: Vehicle): ServiceStatusLevel {
  const dateOverdue = isOverdue(vehicle.next_service_due_date);
  const odomOverdue = isOdometerOverdue(
    vehicle.last_known_odometer_km,
    vehicle.next_service_due_odometer_km,
  );

  if (dateOverdue || odomOverdue) {
    return 'overdue';
  }

  const dateDueSoon = isDueSoon(vehicle.next_service_due_date, 30);
  const odomDueSoon = isOdometerDueSoon(
    vehicle.last_known_odometer_km,
    vehicle.next_service_due_odometer_km,
    1000,
  );

  if (dateDueSoon || odomDueSoon) {
    return 'due_soon';
  }

  if (vehicle.next_service_due_date || vehicle.next_service_due_odometer_km != null) {
    return 'ok';
  }

  return 'unknown';
}

function getStatusBadgeVariant(
  level: ServiceStatusLevel,
): 'error' | 'warning' | 'success' | 'neutral' {
  switch (level) {
    case 'overdue':
      return 'error';
    case 'due_soon':
      return 'warning';
    case 'ok':
      return 'success';
    default:
      return 'neutral';
  }
}

function getStatusLabel(level: ServiceStatusLevel): string {
  switch (level) {
    case 'overdue':
      return 'Overdue';
    case 'due_soon':
      return 'Due Soon';
    case 'ok':
      return 'Up to Date';
    default:
      return 'Unknown';
  }
}

export function VehicleServiceStatus({ vehicle }: VehicleServiceStatusProps): React.ReactElement {
  const level = getServiceStatusLevel(vehicle);
  const badgeVariant = getStatusBadgeVariant(level);
  const statusLabel = getStatusLabel(level);

  const kmRemaining =
    vehicle.last_known_odometer_km != null && vehicle.next_service_due_odometer_km != null
      ? kmUntilService(vehicle.last_known_odometer_km, vehicle.next_service_due_odometer_km)
      : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-h3)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-h3)',
          }}
        >
          Service Status
        </span>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>

      {/* Due date row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-4)',
        }}
      >
        {/* Next service due date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              lineHeight: 'var(--font-line-height-caption)',
            }}
          >
            Next Service Date
          </span>
          {vehicle.next_service_due_date ? (
            <>
              <span
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 'var(--font-weight-medium)',
                  color:
                    level === 'overdue'
                      ? 'var(--color-error)'
                      : level === 'due_soon'
                      ? 'var(--color-warning)'
                      : 'var(--color-body)',
                  lineHeight: 'var(--font-line-height-body)',
                }}
              >
                {formatDate(vehicle.next_service_due_date)}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-muted)',
                  lineHeight: 'var(--font-line-height-small)',
                }}
              >
                {relativeDueLabel(vehicle.next_service_due_date)}
              </span>
            </>
          ) : (
            <span
              style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-muted)',
                lineHeight: 'var(--font-line-height-body)',
              }}
            >
              Not scheduled
            </span>
          )}
        </div>

        {/* Next service due odometer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              lineHeight: 'var(--font-line-height-caption)',
            }}
          >
            Next Service Odometer
          </span>
          {vehicle.next_service_due_odometer_km != null ? (
            <>
              <span
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 'var(--font-weight-medium)',
                  color:
                    isOdometerOverdue(
                      vehicle.last_known_odometer_km,
                      vehicle.next_service_due_odometer_km,
                    )
                      ? 'var(--color-error)'
                      : isOdometerDueSoon(
                          vehicle.last_known_odometer_km,
                          vehicle.next_service_due_odometer_km,
                          1000,
                        )
                      ? 'var(--color-warning)'
                      : 'var(--color-body)',
                  lineHeight: 'var(--font-line-height-body)',
                }}
              >
                {formatOdometer(vehicle.next_service_due_odometer_km)}
              </span>
              {kmRemaining !== null && (
                <span
                  style={{
                    fontSize: 'var(--font-size-small)',
                    color:
                      kmRemaining <= 0 ? 'var(--color-error)' : 'var(--color-muted)',
                    lineHeight: 'var(--font-line-height-small)',
                  }}
                >
                  {kmRemaining <= 0
                    ? `${formatOdometer(Math.abs(kmRemaining))} overdue`
                    : `${formatOdometer(kmRemaining)} remaining`}
                </span>
              )}
            </>
          ) : (
            <span
              style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-muted)',
                lineHeight: 'var(--font-line-height-body)',
              }}
            >
              Not scheduled
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 'var(--space-3)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-4)',
        }}
      >
        {/* Current odometer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              lineHeight: 'var(--font-line-height-caption)',
            }}
          >
            Current Odometer
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-body)',
              fontFamily: 'var(--font-family-mono)',
              lineHeight: 'var(--font-line-height-body)',
            }}
          >
            {vehicle.last_known_odometer_km != null
              ? formatOdometer(vehicle.last_known_odometer_km)
              : '—'}
          </span>
        </div>

        {/* Last serviced */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--font-letter-spacing-caps)',
              lineHeight: 'var(--font-line-height-caption)',
            }}
          >
            Last Serviced
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-body)',
              color: 'var(--color-body)',
              lineHeight: 'var(--font-line-height-body)',
            }}
          >
            {vehicle.last_serviced_at ? formatDate(vehicle.last_serviced_at) : '—'}
          </span>
          {vehicle.last_serviced_odometer_km != null && (
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-family-mono)',
                lineHeight: 'var(--font-line-height-small)',
              }}
            >
              @ {formatOdometer(vehicle.last_serviced_odometer_km)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleServiceStatus;
