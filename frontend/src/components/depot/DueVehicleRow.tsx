import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../../types/vehicle';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/dateUtils';
import { formatOdometer, isDueSoon } from '../../utils/odometerUtils';
import { relativeDueLabel, isOverdue } from '../../utils/dateUtils';

export interface DueVehicleRowProps {
  vehicle: Vehicle;
}

export function DueVehicleRow({ vehicle }: DueVehicleRowProps): React.ReactElement {
  const navigate = useNavigate();

  const dueDateOverdue =
    vehicle.next_service_due_date != null && isOverdue(vehicle.next_service_due_date);
  const dueDateSoon =
    !dueDateOverdue &&
    vehicle.next_service_due_date != null &&
    isDueSoon(vehicle.last_known_odometer_km, vehicle.next_service_due_odometer_km);

  const getDateBadgeVariant = (): 'warning' | 'error' | 'neutral' => {
    if (dueDateOverdue) return 'error';
    if (dueDateSoon) return 'warning';
    return 'neutral';
  };

  const handleRowClick = () => {
    navigate(`/vehicles/${vehicle.id}`);
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
        {formatOdometer(vehicle.last_known_odometer_km)}
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
                  : dueDateSoon
                  ? 'var(--color-warning)'
                  : 'var(--color-body)',
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

      {/* Status badge */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Badge
          variant={
            vehicle.status === 'active'
              ? 'success'
              : vehicle.status === 'inactive'
              ? 'neutral'
              : 'error'
          }
        >
          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
        </Badge>
      </td>

      {/* Service due indicator badge */}
      <td
        style={{
          padding: 'var(--space-3) var(--space-4)',
          whiteSpace: 'nowrap',
        }}
      >
        <Badge variant={getDateBadgeVariant()}>
          {dueDateOverdue ? 'Overdue' : dueDateSoon ? 'Due Soon' : 'Upcoming'}
        </Badge>
      </td>
    </tr>
  );
}

export default DueVehicleRow;
