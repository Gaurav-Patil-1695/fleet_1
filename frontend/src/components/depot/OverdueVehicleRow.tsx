import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { VehicleServiceSummary } from '../../types/depot';
import Badge from '../ui/Badge';
import { formatDate, relativeDueLabel } from '../../utils/dateUtils';
import { formatOdometer } from '../../utils/odometerUtils';

export interface OverdueVehicleRowProps {
  vehicle: VehicleServiceSummary;
}

export function OverdueVehicleRow({ vehicle }: OverdueVehicleRowProps): React.ReactElement {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(`/vehicles/${vehicle.vehicle_id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick();
    }
  };

  const kmUntilService =
    vehicle.next_service_due_odometer_km != null &&
    vehicle.last_known_odometer_km != null
      ? vehicle.next_service_due_odometer_km - vehicle.last_known_odometer_km
      : null;

  const isOdometerOverdue = kmUntilService != null && kmUntilService <= 0;

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View overdue vehicle ${vehicle.registration_number}`}
      style={{
        cursor: 'pointer',
        transition: 'background 0.15s',
        outline: 'none',
        borderLeft: '4px solid var(--color-error)',
        background: 'var(--color-error-light)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background =
          'color-mix(in srgb, var(--color-error-light) 80%, var(--color-surface-raised))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-error-light)';
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow =
          '0 0 0 2px var(--color-focus-ring)';
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow = '';
      }}
    >
      {/* Error icon + Registration */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <img
            src="/src/assets/icons/error.svg"
            alt="Overdue"
            width={16}
            height={16}
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
            }}
          >
            {vehicle.registration_number}
          </span>
        </span>
      </td>

      {/* Make & Model */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-body)',
        }}
      >
        {vehicle.make} {vehicle.model}
      </td>

      {/* Current odometer */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-body)',
          whiteSpace: 'nowrap',
        }}
      >
        {vehicle.last_known_odometer_km != null
          ? formatOdometer(vehicle.last_known_odometer_km)
          : <span style={{ color: 'var(--color-muted)' }}>—</span>}
      </td>

      {/* Next service due odometer */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          whiteSpace: 'nowrap',
        }}
      >
        {vehicle.next_service_due_odometer_km != null ? (
          <span
            style={{
              color: isOdometerOverdue ? 'var(--color-error)' : 'var(--color-body)',
              fontWeight: isOdometerOverdue
                ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
                : undefined,
            }}
          >
            {formatOdometer(vehicle.next_service_due_odometer_km)}
            {isOdometerOverdue && (
              <span
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-error)',
                }}
              >
                {Math.abs(kmUntilService!).toLocaleString()} km overdue
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: 'var(--color-muted)' }}>—</span>
        )}
      </td>

      {/* Next service due date */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-small)',
          whiteSpace: 'nowrap',
        }}
      >
        {vehicle.next_service_due_date != null ? (
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
            }}
          >
            <span
              style={{
                color: 'var(--color-error)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              }}
            >
              {formatDate(vehicle.next_service_due_date)}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-error)',
              }}
            >
              {relativeDueLabel(vehicle.next_service_due_date)}
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--color-muted)' }}>—</span>
        )}
      </td>

      {/* Overdue badge */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Badge variant="error">Overdue</Badge>
      </td>
    </tr>
  );
}

export default OverdueVehicleRow;
