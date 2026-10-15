import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles } from '../hooks/useVehicles';
import { usePermission } from '../hooks/usePermission';
import type { VehicleStatus } from '../types/vehicle';
import { formatDate } from '../utils/dateUtils';
import { isOverdue } from '../utils/dateUtils';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: VehicleStatus }): React.ReactElement {
  if (status === 'active') {
    return (
      <span
        style={{
          background: 'var(--color-success-light)',
          color: 'var(--color-ink)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--font-size-caption)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        ✔ Active
      </span>
    );
  }
  if (status === 'inactive') {
    return (
      <span
        style={{
          background: 'var(--color-warning-light)',
          color: 'var(--color-ink)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--font-size-caption)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        ⏸ Inactive
      </span>
    );
  }
  return (
    <span
      style={{
        background: 'var(--color-surface-raised)',
        color: 'var(--color-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontSize: 'var(--font-size-caption)',
        padding: 'var(--space-1) var(--space-2)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        fontWeight: 'var(--font-weight-medium)',
      }}
    >
      ✖ Decommissioned
    </span>
  );
}

function ServiceDueCell({ date }: { date: string | null | undefined }): React.ReactElement {
  if (!date) {
    return <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-caption)' }}>—</span>;
  }
  const overdue = isOverdue(date);
  if (overdue) {
    return (
      <span
        style={{
          color: 'var(--color-error)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--font-size-caption)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
        }}
      >
        ⚠ {formatDate(date)}
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--color-body)', fontSize: 'var(--font-size-caption)' }}>
      {formatDate(date)}
    </span>
  );
}

function TelematicsCell({ hasTelematic }: { hasTelematic: boolean }): React.ReactElement {
  if (hasTelematic) {
    return (
      <span
        style={{
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-ink)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        ● Fitted
      </span>
    );
  }
  return (
    <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>— None</span>
  );
}

function SkeletonRow(): React.ReactElement {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div
            style={{
              height: '16px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--color-surface-raised)',
              position: 'relative',
              overflow: 'hidden',
              width: i === 0 ? '80px' : i === 1 ? '120px' : '90px',
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
          </div>
        </td>
      ))}
    </tr>
  );
}

// Inline depot fetching without a separate hook since useDepots is not in module map
// We'll use the depotsService directly via the listDepots function
import { listDepots } from '../services/depotsService';
import type { Depot } from '../types/depot';

function useDepots() {
  const [depots, setDepots] = React.useState<Depot[]>([]);
  React.useEffect(() => {
    listDepots({}).then((res) => setDepots(res.data)).catch(() => setDepots([]));
  }, []);
  return depots;
}

export default function VehicleListPage(): React.ReactElement {
  const navigate = useNavigate();
  const { canAccess } = usePermission();
  const canAddVehicle = canAccess(['administrator', 'manager']);
  const canEdit = canAccess(['administrator', 'manager']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [depotFilter, setDepotFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const depots = useDepots();

  const params = useMemo(
    () => ({
      status: statusFilter || undefined,
      depot_id: depotFilter || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [statusFilter, depotFilter, page],
  );

  const { vehicles, pagination, isLoading, error, refetch } = useVehicles(params);

  // Client-side search filter on registration_number, make, model
  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.trim().toLowerCase();
    return vehicles.filter(
      (v) =>
        v.registration_number.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  // Summary counters based on the full result set
  const total = pagination?.total_items ?? vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === 'active').length;
  const inactiveCount = vehicles.filter((v) => v.status === 'inactive').length;
  const decommissionedCount = vehicles.filter((v) => v.status === 'decommissioned').length;
  const overdueCount = vehicles.filter(
    (v) => v.next_service_due_date && isOverdue(v.next_service_due_date),
  ).length;

  const totalPages = pagination?.total_pages ?? 1;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  function handleDepotChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDepotFilter(e.target.value);
    setPage(1);
  }

  function handleRowClick(vehicleId: string) {
    navigate(`/vehicles/${vehicleId}`);
  }

  function handleViewClick(e: React.MouseEvent, vehicleId: string) {
    e.stopPropagation();
    navigate(`/vehicles/${vehicleId}`);
  }

  function handleEditClick(e: React.MouseEvent, vehicleId: string) {
    e.stopPropagation();
    navigate(`/vehicles/${vehicleId}/edit`);
  }

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= totalPages; i++) nums.push(i);
    return nums;
  }, [totalPages]);

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-6) 0',
        }}
      >
        Vehicle Register
      </h1>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div style={{ margin: 0, minWidth: '220px' }}>
            <label htmlFor="vehicle-list-search-reg" style={{ display: 'none' }}>
              Search registration
            </label>
            <input
              id="vehicle-list-search-reg"
              type="search"
              placeholder="🔍  Search registration, make or model…"
              value={search}
              onChange={handleSearchChange}
              style={{
                fontSize: 'var(--font-size-small)',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                color: 'var(--color-body)',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 'var(--touch-target-min)',
                outline: 'none',
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ margin: 0 }}>
            <label htmlFor="vehicle-list-filter-status" style={{ display: 'none' }}>
              Filter by status
            </label>
            <select
              id="vehicle-list-filter-status"
              value={statusFilter}
              onChange={handleStatusChange}
              style={{
                fontSize: 'var(--font-size-small)',
                minWidth: '150px',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                color: 'var(--color-body)',
                minHeight: 'var(--touch-target-min)',
                outline: 'none',
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>

          {/* Depot filter */}
          <div style={{ margin: 0 }}>
            <label htmlFor="vehicle-list-filter-depot" style={{ display: 'none' }}>
              Filter by depot
            </label>
            <select
              id="vehicle-list-filter-depot"
              value={depotFilter}
              onChange={handleDepotChange}
              style={{
                fontSize: 'var(--font-size-small)',
                minWidth: '150px',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                color: 'var(--color-body)',
                minHeight: 'var(--touch-target-min)',
                outline: 'none',
              }}
            >
              <option value="">All depots</option>
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canAddVehicle && (
          <Button
            variant="primary"
            onClick={() => navigate('/vehicles/new')}
            style={{ whiteSpace: 'nowrap' }}
          >
            ＋ Add Vehicle
          </Button>
        )}
      </div>

      {/* Summary counters */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            flex: '1',
            minWidth: '140px',
            padding: 'var(--space-4)',
            background: 'var(--color-surface)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
            }}
          >
            {isLoading ? '—' : total}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              marginTop: 'var(--space-1)',
            }}
          >
            Total Vehicles
          </div>
        </div>

        <div
          style={{
            flex: '1',
            minWidth: '140px',
            padding: 'var(--space-4)',
            background: 'var(--color-success-light)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-ink)',
            }}
          >
            {isLoading ? '—' : activeCount}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              marginTop: 'var(--space-1)',
            }}
          >
            Active
          </div>
        </div>

        <div
          style={{
            flex: '1',
            minWidth: '140px',
            padding: 'var(--space-4)',
            background: 'var(--color-warning-light)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-ink)',
            }}
          >
            {isLoading ? '—' : inactiveCount}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              marginTop: 'var(--space-1)',
            }}
          >
            Inactive
          </div>
        </div>

        <div
          style={{
            flex: '1',
            minWidth: '140px',
            padding: 'var(--space-4)',
            background: 'var(--color-surface-raised)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-ink)',
            }}
          >
            {isLoading ? '—' : decommissionedCount}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
              marginTop: 'var(--space-1)',
            }}
          >
            Decommissioned
          </div>
        </div>

        <div
          style={{
            flex: '1',
            minWidth: '140px',
            padding: 'var(--space-4)',
            background: 'var(--color-error-light)',
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-ink)',
            }}
          >
            {isLoading ? '—' : overdueCount}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-ink)',
              marginTop: 'var(--space-1)',
            }}
          >
            Service Overdue
          </div>
        </div>
      </div>

      {/* Vehicle Table */}
      <div
        style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--elevation-2)',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--font-size-small)',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--color-primary-dark)',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                {[
                  'Registration',
                  'Make / Model',
                  'Type',
                  'Depot',
                  'Status',
                  'Telematics',
                  'Service Due',
                  'Actions',
                ].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      textAlign: 'left',
                      fontWeight: 'var(--font-weight-semibold)',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      fontSize: 'var(--font-size-caption)',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid var(--color-primary)',
                      color: 'var(--color-on-primary-dark)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ padding: 'var(--space-6)' }}>
                    <Alert
                      variant="error"
                      message="Could not load vehicle records. Please try again."
                    />
                    <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                      <Button variant="primary" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 'var(--space-12) var(--space-6)',
                      textAlign: 'center',
                      color: 'var(--color-muted)',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>🚛</div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-body)',
                        color: 'var(--color-muted)',
                        margin: '0 0 var(--space-4) 0',
                      }}
                    >
                      No vehicles are registered in the system.
                    </p>
                    {canAddVehicle && (
                      <Button variant="primary" onClick={() => navigate('/vehicles/new')}>
                        ＋ Add Vehicle
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((vehicle) => {
                  const isDecommissioned = vehicle.status === 'decommissioned';
                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => handleRowClick(vehicle.id)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        transition: 'background 0.15s',
                        opacity: isDecommissioned ? 0.75 : 1,
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--color-canvas)';
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = '';
                      }}
                    >
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          fontWeight: 'var(--font-weight-semibold)',
                          fontFamily: 'var(--font-family-mono)',
                          color: isDecommissioned
                            ? 'var(--color-muted)'
                            : 'var(--color-primary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {vehicle.registration_number}
                      </td>
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          color: isDecommissioned ? 'var(--color-muted)' : 'var(--color-body)',
                        }}
                      >
                        {vehicle.make} {vehicle.model}
                      </td>
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          color: 'var(--color-muted)',
                        }}
                      >
                        {vehicle.vehicle_type_id}
                      </td>
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          color: isDecommissioned ? 'var(--color-muted)' : 'var(--color-body)',
                        }}
                      >
                        {vehicle.depot_id}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <StatusBadge status={vehicle.status} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <TelematicsCell hasTelematic={vehicle.has_telematics} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <ServiceDueCell date={vehicle.next_service_due_date} />
                      </td>
                      <td
                        style={{ padding: 'var(--space-3) var(--space-4)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            onClick={(e) => handleViewClick(e, vehicle.id)}
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              padding: 'var(--space-1) var(--space-2)',
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-xs)',
                              cursor: 'pointer',
                              color: 'var(--color-body)',
                              fontFamily: 'inherit',
                            }}
                          >
                            View
                          </button>
                          {canEdit && !isDecommissioned && (
                            <button
                              onClick={(e) => handleEditClick(e, vehicle.id)}
                              style={{
                                fontSize: 'var(--font-size-caption)',
                                padding: 'var(--space-1) var(--space-2)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-xs)',
                                cursor: 'pointer',
                                color: 'var(--color-body)',
                                fontFamily: 'inherit',
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer with pagination */}
        {!error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-4)',
              borderTop: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-raised)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
              color: 'var(--color-on-surface-raised)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-on-surface-raised)',
              }}
            >
              {isLoading
                ? 'Loading…'
                : `Showing ${filtered.length} of ${total} vehicle${total !== 1 ? 's' : ''}`}
            </span>
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: page === 1 ? 'var(--color-disabled)' : 'var(--color-on-surface-raised)',
                    fontFamily: 'inherit',
                  }}
                >
                  ‹ Previous
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      padding: 'var(--space-1) var(--space-3)',
                      background:
                        num === page ? 'var(--color-primary)' : 'transparent',
                      border: `1px solid ${
                        num === page ? 'var(--color-primary)' : 'var(--color-border)'
                      }`,
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      color:
                        num === page
                          ? 'var(--color-on-primary)'
                          : 'var(--color-on-surface-raised)',
                      fontWeight:
                        num === page ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    color:
                      page === totalPages
                        ? 'var(--color-disabled)'
                        : 'var(--color-on-surface-raised)',
                    fontFamily: 'inherit',
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-5)',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: 'var(--space-6)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: 'var(--font-letter-spacing-caps)',
            color: 'var(--color-muted)',
          }}
        >
          LEGEND:
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--color-body)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-success)',
            }}
          />
          Active
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--color-body)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-warning)',
            }}
          />
          Inactive
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--color-body)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-border)',
            }}
          />
          Decommissioned
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--color-error)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          ⚠ Service date shown in red = overdue
        </span>
      </div>
    </div>
  );
}
