import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDepotDashboard } from '../hooks/useDepotDashboard';
import { usePermission } from '../hooks/usePermission';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import OverdueVehicleRow from '../components/depot/OverdueVehicleRow';
import DueVehicleRow from '../components/depot/DueVehicleRow';
import DashboardStats from '../components/depot/DashboardStats';
import type { VehicleServiceSummary } from '../types/depot';

export default function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess } = usePermission();

  const depotId: string | null =
    user && 'depot_id' in user ? (user as { depot_id: string | null }).depot_id : null;

  const { dashboard, isLoading, error, refetch } = useDepotDashboard(depotId);

  const overdueVehicles: VehicleServiceSummary[] = dashboard?.overdue ?? [];
  const dueVehicles: VehicleServiceSummary[] = dashboard?.due_for_service ?? [];

  const depotName =
    user && 'depot_name' in user
      ? (user as { depot_name?: string }).depot_name
      : null;

  const subtitleDepot = depotName ?? 'Your Depot';

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
          color: 'var(--color-ink)',
          lineHeight: 'var(--font-line-height-h1)',
          margin: '0 0 var(--space-1) 0',
        }}
      >
        Depot Dashboard
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-6)',
          marginTop: '0',
        }}
      >
        {subtitleDepot} &middot; Last updated just now
      </p>

      {/* Summary bar */}
      {!error && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap',
          }}
        >
          {/* Overdue card */}
          <div
            style={{
              flex: '1',
              minWidth: '160px',
              background: 'var(--color-error-light)',
              color: 'var(--color-ink)',
              borderLeft: '4px solid var(--color-error)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                textTransform: 'uppercase',
                color: 'var(--color-ink)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Overdue
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-ink)',
                lineHeight: 'var(--font-line-height-display)',
              }}
            >
              {isLoading ? '—' : overdueVehicles.length}
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-ink)' }}>
              vehicles require immediate attention
            </div>
          </div>

          {/* Due for service card */}
          <div
            style={{
              flex: '1',
              minWidth: '160px',
              background: 'var(--color-warning-light)',
              color: 'var(--color-ink)',
              borderLeft: '4px solid var(--color-warning)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                textTransform: 'uppercase',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Due for Service
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-ink)',
                lineHeight: 'var(--font-line-height-display)',
              }}
            >
              {isLoading ? '—' : dueVehicles.length}
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              vehicles due within the next 30 days
            </div>
          </div>

          {/* Total fleet card */}
          <div
            style={{
              flex: '1',
              minWidth: '160px',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              borderLeft: '4px solid var(--color-primary)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                textTransform: 'uppercase',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Total Fleet
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-primary)',
                lineHeight: 'var(--font-line-height-display)',
              }}
            >
              {isLoading ? '—' : (dashboard ? overdueVehicles.length + dueVehicles.length : 0)}
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              registered vehicles at this depot
            </div>
          </div>

          {/* Open work orders card */}
          <div
            style={{
              flex: '1',
              minWidth: '160px',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              borderLeft: '4px solid var(--color-success)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                textTransform: 'uppercase',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Open Work Orders
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-ink)',
                lineHeight: 'var(--font-line-height-display)',
              }}
            >
              —
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              in progress across fleet
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
        }}
      >
        <Button variant="primary" onClick={() => navigate('/vehicles')}>
          View all vehicles
        </Button>
        <Button variant="secondary" onClick={() => navigate('/work-orders')}>
          Work orders
        </Button>
        <Button variant="ghost" onClick={() => navigate('/work-orders/new')}>
          + New work order
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div>
          {/* Skeleton shimmer for overdue section */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-h2)',
                  fontWeight: 'var(--font-weight-h2)',
                  color: 'var(--color-ink)',
                  lineHeight: 'var(--font-line-height-h2)',
                }}
              >
                ⚠ Overdue
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>

          {/* Skeleton shimmer for due section */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-h2)',
                  fontWeight: 'var(--font-weight-h2)',
                  color: 'var(--color-ink)',
                  lineHeight: 'var(--font-line-height-h2)',
                }}
              >
                🕐 Due for Service
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <Alert
            variant="error"
            message="Unable to load the service due list. Please try again."
          />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {!isLoading && !error && dashboard && (
        <>
          {/* OVERDUE SECTION */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-h2)',
                  fontWeight: 'var(--font-weight-h2)',
                  color: 'var(--color-ink)',
                  lineHeight: 'var(--font-line-height-h2)',
                }}
              >
                ⚠ Overdue
              </span>
              <Badge variant="error">
                {overdueVehicles.length} vehicle{overdueVehicles.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {overdueVehicles.length === 0 ? (
              <EmptySection />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {overdueVehicles.map((vehicle) => (
                  <OverdueVehicleRow key={vehicle.vehicle_id} vehicle={vehicle} />
                ))}
              </div>
            )}
          </div>

          {/* DUE FOR SERVICE SECTION */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-h2)',
                  fontWeight: 'var(--font-weight-h2)',
                  color: 'var(--color-ink)',
                  lineHeight: 'var(--font-line-height-h2)',
                }}
              >
                🕐 Due for Service
              </span>
              <Badge variant="warning">
                {dueVehicles.length} vehicle{dueVehicles.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {dueVehicles.length === 0 ? (
              <EmptySection />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {dueVehicles.slice(0, 3).map((vehicle) => (
                    <DueVehicleRow key={vehicle.vehicle_id} vehicle={vehicle} />
                  ))}
                </div>
                {dueVehicles.length > 3 && (
                  <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/vehicles')}
                      style={{
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      View all {dueVehicles.length - 3} remaining vehicles due for service &rarr;
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Empty state when both lists are empty */}
          {overdueVehicles.length === 0 && dueVehicles.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-12) var(--space-6)',
                color: 'var(--color-muted)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>✓</div>
              <p style={{ fontSize: 'var(--font-size-body)', margin: '0' }}>
                No vehicles are currently due or overdue for service at this depot.
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer shortcut row */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/schedules')}
          style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}
        >
          View maintenance schedules
        </Button>
        {depotId && (
          <Button
            variant="ghost"
            onClick={() => navigate(`/vehicles`)}
            style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}
          >
            Enter odometer reading
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate('/my-work-orders')}
          style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}
        >
          My work orders
        </Button>
      </div>
    </div>
  );
}

function SkeletonCard(): React.ReactElement {
  return (
    <div
      style={{
        height: '88px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-raised)',
        borderLeft: '4px solid var(--color-border)',
        boxShadow: 'var(--elevation-1)',
        overflow: 'hidden',
        position: 'relative',
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

function EmptySection(): React.ReactElement {
  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-6)',
        textAlign: 'center',
        color: 'var(--color-muted)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>✓</div>
      <p style={{ fontSize: 'var(--font-size-small)', margin: '0' }}>
        No vehicles are currently due or overdue for service at this depot.
      </p>
    </div>
  );
}
