import React from 'react';
import type { Schedule } from '../../types/schedule';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export interface ScheduleCardProps {
  schedule: Schedule;
  vehicleTypeName?: string;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
}

function vehicleClassLabel(vehicleClass: Schedule['vehicle_class']): string {
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

export function ScheduleCard({
  schedule,
  vehicleTypeName,
  onEdit,
  onDelete,
}: ScheduleCardProps): React.ReactElement {
  return (
    <Card>
      <div
        style={{
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
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-h3)',
                fontWeight: 'var(--font-weight-semibold)',
                lineHeight: 'var(--font-line-height-h3)',
                color: 'var(--color-body)',
              }}
            >
              {vehicleTypeName ?? 'Unknown Vehicle Type'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-regular)',
                lineHeight: 'var(--font-line-height-small)',
                color: 'var(--color-muted)',
              }}
            >
              {vehicleClassLabel(schedule.vehicle_class)}
            </span>
          </div>

          <Badge variant={schedule.is_active ? 'success' : 'neutral'}>
            {schedule.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Interval details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            backgroundColor: 'var(--color-canvas)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-regular)',
                lineHeight: 'var(--font-line-height-caption)',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--font-letter-spacing-caps)',
              }}
            >
              KM Interval
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-body)',
                fontWeight: 'var(--font-weight-semibold)',
                lineHeight: 'var(--font-line-height-body)',
                color: 'var(--color-body)',
              }}
            >
              {schedule.km_interval.toLocaleString()} km
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-regular)',
                lineHeight: 'var(--font-line-height-caption)',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--font-letter-spacing-caps)',
              }}
            >
              Month Interval
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-body)',
                fontWeight: 'var(--font-weight-semibold)',
                lineHeight: 'var(--font-line-height-body)',
                color: 'var(--color-body)',
              }}
            >
              {schedule.month_interval}{' '}
              {schedule.month_interval === 1 ? 'month' : 'months'}
            </span>
          </div>
        </div>

        {/* Note: whichever comes first */}
        <p
          style={{
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-regular)',
            lineHeight: 'var(--font-line-height-small)',
            color: 'var(--color-muted)',
            margin: 0,
          }}
        >
          Service due at{' '}
          <strong>{schedule.km_interval.toLocaleString()} km</strong> or{' '}
          <strong>{schedule.month_interval} {schedule.month_interval === 1 ? 'month' : 'months'}</strong>,{' '}
          whichever comes first.
        </p>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border-subtle)',
            }}
          >
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(schedule)}
                style={{
                  fontFamily: 'var(--font-family-base)',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  minHeight: 'var(--touch-target-min)',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(schedule)}
                style={{
                  fontFamily: 'var(--font-family-base)',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-error)',
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  minHeight: 'var(--touch-target-min)',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default ScheduleCard;
