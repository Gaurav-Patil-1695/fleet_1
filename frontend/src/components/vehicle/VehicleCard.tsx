import React from 'react';
import { Vehicle } from '../../types/vehicle';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { formatDate } from '../../utils/dateUtils';
import { formatOdometer } from '../../utils/odometerUtils';

export interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  depotName?: string;
  vehicleTypeName?: string;
}

export function VehicleCard({
  vehicle,
  onClick,
  depotName,
  vehicleTypeName,
}: VehicleCardProps): React.ReactElement {
  function getStatusVariant(status: Vehicle['status']): 'success' | 'warning' | 'error' | 'neutral' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'decommissioned':
        return 'error';
      default:
        return 'neutral';
    }
  }

  function getStatusLabel(status: Vehicle['status']): string {
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

  return (
    <Card
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-h3)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              letterSpacing: 'var(--font-letter-spacing-wide)',
              lineHeight: 'var(--font-line-height-h3)',
            }}
          >
            {vehicle.registration_number}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-body)',
              lineHeight: 'var(--font-line-height-body)',
            }}
          >
            {vehicle.make} {vehicle.model}
          </span>
        </div>
        <Badge variant={getStatusVariant(vehicle.status)}>
          {getStatusLabel(vehicle.status)}
        </Badge>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-2) var(--space-4)',
        }}
      >
        {vehicleTypeName && (
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
              Type
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
                lineHeight: 'var(--font-line-height-small)',
              }}
            >
              {vehicleTypeName}
            </span>
          </div>
        )}

        {depotName && (
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
              Depot
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
                lineHeight: 'var(--font-line-height-small)',
              }}
            >
              {depotName}
            </span>
          </div>
        )}

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
            In Service
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-body)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {formatDate(vehicle.in_service_date)}
          </span>
        </div>

        {vehicle.last_known_odometer_km != null && (
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
              Odometer
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
                lineHeight: 'var(--font-line-height-small)',
              }}
            >
              {formatOdometer(vehicle.last_known_odometer_km)}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        {vehicle.has_telematics && (
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-info)',
              fontWeight: 'var(--font-weight-medium)',
              lineHeight: 'var(--font-line-height-caption)',
            }}
          >
            ● Telematics
          </span>
        )}

        {vehicle.next_service_due_date && (
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-muted)',
              lineHeight: 'var(--font-line-height-caption)',
              marginLeft: vehicle.has_telematics ? 'var(--space-2)' : undefined,
            }}
          >
            Next service: {formatDate(vehicle.next_service_due_date)}
          </span>
        )}
      </div>
    </Card>
  );
}

export default VehicleCard;
