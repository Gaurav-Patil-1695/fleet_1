import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { VehicleServiceSummary } from '../../types/depot';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/dateUtils';
import { formatOdometer } from '../../utils/odometerUtils';
import { relativeDueLabel, isOverdue } from '../../utils/dateUtils';

export interface DueVehicleRowProps {
  vehicle: VehicleServiceSummary;
}

export function DueVehicleRow({ vehicle }: DueVehicleRowProps): React.ReactElement {
  const navigate = useNavigate();

  const dueDateOverdue =
    vehicle.next_service_due_date != null && isOverdue(vehicle.next_service_due_date);

  const getDateBadgeVariant = (): 'warning' | 'error' | 'neutral' => {
    if (dueDateOverdue) return 'error';
    return 'warning';
  };

  const handleRowClick = () => {
    navigate(`/vehicles/${vehicle.vehicle_id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick();
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View vehicle ${vehicle.registration_number}`}
      style={{
        cursor: 'pointer',
        transition: 'background 0.15s',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background =
          'var(--color-surface-raised)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = '';
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow =
          '0 0 0 2px var(--color-focus-ring)';
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow = '';
      }}
    >
      {/* Registration / Vehicle name */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        {vehicle.registration_number}
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
          color: 'var(--color-body)',
          whiteSpace: 'nowrap',
        }}
      >
        {vehicle.next_service_due_odometer_km != null
          ? formatOdometer(vehicle.next_service_due_odometer_km)
          : <span style={{ color: 'var(--color-muted)' }}>—</span>}
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
                color: dueDateOverdue
                  ? 'var(--color-error)'
                  : 'var(--color-warning)',
                fontWeight: dueDateOverdue
                  ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
                  : undefined,
              }}
            >
              {formatDate(vehicle.next_service_due_date)}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: dueDateOverdue ? 'var(--color-error)' : 'var(--color-muted)',
              }}
            >
              {relativeDueLabel(vehicle.next_service_due_date)}
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--color-muted)' }}>—</span>
        )}
      </td>

      {/* Service due indicator badge */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Badge variant={getDateBadgeVariant()}>
          {dueDateOverdue ? 'Overdue' : 'Due Soon'}
        </Badge>
      </td>
    </tr>
  );
}

export default DueVehicleRow;
