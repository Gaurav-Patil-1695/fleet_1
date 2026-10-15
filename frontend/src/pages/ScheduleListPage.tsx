import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedules } from '../hooks/useSchedules';
import { usePermission } from '../hooks/usePermission';
import { deleteSchedule } from '../services/schedulesService';
import { getErrorMessage } from '../utils/errorUtils';
import type { Schedule } from '../types/schedule';
import type { VehicleClass } from '../types/schedule';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

function VehicleClassBadge({ vehicleClass }: { vehicleClass: VehicleClass }): React.ReactElement {
  const configs: Record<VehicleClass, { label: string; bg: string }> = {
    heavy_truck: { label: 'Heavy truck', bg: 'var(--color-sky-40)' },
    light_commercial: { label: 'Light commercial', bg: 'var(--color-sage-40)' },
    other: { label: 'Other', bg: 'var(--color-warm-grey-40)' },
  };
  const config = configs[vehicleClass] ?? { label: vehicleClass, bg: 'var(--color-warm-grey-40)' };
  return (
    <span
      style={{
        display: 'inline-block',
        background: config.bg,
        color: 'var(--color-ink)',
        fontSize: 'var(--font-size-caption)',
        fontWeight: 'var(--font-weight-semibold)',
        borderRadius: 'var(--radius-full)',
        padding: 'var(--space-1) var(--space-3)',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }): React.ReactElement {
  if (isActive) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          color: 'var(--color-success)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--font-size-small)',
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill="currentColor" />
        </svg>
        Active
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        color: 'var(--color-muted)',
        fontWeight: 'var(--font-weight-semibold)',
        fontSize: 'var(--font-size-small)',
        background: 'var(--color-warm-grey-40)',
        borderRadius: 'var(--radius-full)',
        padding: 'var(--space-1) var(--space-3)',
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="var(--color-ink)" />
      </svg>
      Inactive
    </span>
  );
}

export default function ScheduleListPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isAdministrator } = usePermission();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedClass, setAppliedClass] = useState<string>('');
  const [appliedStatus, setAppliedStatus] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const schedulesParams: Record<string, unknown> = {};
  if (appliedClass) schedulesParams.vehicle_class = appliedClass;
  if (appliedStatus === 'active') schedulesParams.is_active = true;
  if (appliedStatus === 'inactive') schedulesParams.is_active = false;

  const { schedules, isLoading, error, refetch } = useSchedules(schedulesParams);

  const filtered = schedules.filter((s) => {
    if (!appliedSearch) return true;
    const term = appliedSearch.toLowerCase();
    return (
      s.vehicle_class.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  });

  const totalSchedules = filtered.length;
  const activeCount = filtered.filter((s) => s.is_active).length;
  const inactiveCount = filtered.filter((s) => !s.is_active).length;
  const uniqueClasses = new Set(filtered.map((s) => s.vehicle_class)).size;

  function handleFilter() {
    setAppliedSearch(searchTerm);
    setAppliedClass(filterClass);
    setAppliedStatus(filterStatus);
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSchedule(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err) || 'Failed to delete schedule. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, refetch]);

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: 'var(--space-3) var(--space-5)',
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
    borderBottom: '1px solid var(--color-border-subtle)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3) var(--space-5)',
    borderBottom: '1px solid var(--color-border-subtle)',
    color: 'var(--color-on-surface)',
  };

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-h1)',
              lineHeight: 'var(--font-line-height-h1)',
              color: 'var(--color-ink)',
              margin: '0',
            }}
          >
            Service Schedules
          </h1>
          <p
            style={{
              margin: 'var(--space-1) 0 0',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-muted)',
            }}
          >
            Define service intervals by vehicle type and class
          </p>
        </div>
        {isAdministrator && (
          <Button
            variant="primary"
            onClick={() => navigate('/schedules/new')}
            style={{
              background: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary-dark)',
              minHeight: 'var(--touch-target-min)',
              padding: '0 var(--space-5)',
              fontWeight: 'var(--font-weight-semibold)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            + Add Schedule
          </Button>
        )}
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {([
          { label: 'Total Schedules', value: isLoading ? '—' : String(totalSchedules) },
          { label: 'Active', value: isLoading ? '—' : String(activeCount) },
          { label: 'Inactive', value: isLoading ? '—' : String(inactiveCount) },
          { label: 'Vehicle Classes', value: isLoading ? '—' : String(uniqueClasses) },
        ] as { label: string; value: string }[]).map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: '1',
              minWidth: '140px',
              background: 'var(--color-surface)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4) var(--space-5)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-on-surface)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                marginBottom: 'var(--space-1)',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-ink)',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--elevation-1)',
          border: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4) var(--space-5)',
          color: 'var(--color-on-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '2', minWidth: '180px', margin: '0' }}>
            <label
              htmlFor="schedule-search"
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-body)',
                display: 'block',
                marginBottom: 'var(--space-1)',
              }}
            >
              Search vehicle type
            </label>
            <input
              id="schedule-search"
              type="text"
              placeholder="e.g. Volvo FH16…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFilter(); }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 'var(--touch-target-min)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ flex: '1', minWidth: '160px', margin: '0' }}>
            <label
              htmlFor="schedule-class-filter"
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-body)',
                display: 'block',
                marginBottom: 'var(--space-1)',
              }}
            >
              Vehicle class
            </label>
            <select
              id="schedule-class-filter"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 'var(--touch-target-min)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All classes</option>
              <option value="heavy_truck">Heavy truck</option>
              <option value="light_commercial">Light commercial</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '140px', margin: '0' }}>
            <label
              htmlFor="schedule-status-filter"
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-body)',
                display: 'block',
                marginBottom: 'var(--space-1)',
              }}
            >
              Status
            </label>
            <select
              id="schedule-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 'var(--touch-target-min)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Button
            variant="secondary"
            onClick={handleFilter}
            style={{ minHeight: 'var(--touch-target-min)', padding: '0 var(--space-5)', whiteSpace: 'nowrap' }}
          >
            Filter
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-12) var(--space-6)',
            color: 'var(--color-muted)',
          }}
        >
          <Spinner size="md" />
          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
            Loading schedules…
          </span>
          {/* Skeleton rows */}
          <div
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--elevation-1)',
              border: '1px solid var(--color-border-subtle)',
              overflow: 'hidden',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: '60px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-canvas)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, transparent 0%, var(--color-surface-raised) 50%, transparent 100%)',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              </div>
            ))}
            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div>
          <Alert
            variant="error"
            message="Unable to load schedules — please try again."
          />
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="primary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
          <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
            {getErrorMessage(error)}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--elevation-1)',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-12) var(--space-6)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-canvas)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
              style={{ color: 'var(--color-muted)' }}
            >
              <rect x="4" y="8" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M4 14h24" stroke="currentColor" strokeWidth="2" />
              <path d="M11 4v8M21 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-h2)',
              color: 'var(--color-ink)',
              margin: '0 0 var(--space-2) 0',
            }}
          >
            No schedules defined
          </h2>
          <p
            style={{
              fontSize: 'var(--font-size-body)',
              color: 'var(--color-muted)',
              margin: '0 0 var(--space-6) 0',
            }}
          >
            Create a schedule to define service intervals for a vehicle type.
          </p>
          {isAdministrator ? (
            <Button variant="primary" onClick={() => navigate('/schedules/new')}>
              Add Schedule
            </Button>
          ) : (
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)', margin: '0' }}>
              An administrator must configure schedules before they appear here.
            </p>
          )}
        </div>
      )}

      {/* Schedule Table */}
      {!isLoading && !error && filtered.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--elevation-1)',
            border: '1px solid var(--color-border-subtle)',
            overflow: 'hidden',
            color: 'var(--color-on-surface)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--font-size-small)',
                color: 'var(--color-body)',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-surface-raised)' }}>
                  <th style={thStyle}>Vehicle Type</th>
                  <th style={thStyle}>Vehicle Class</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>KM Interval</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Month Interval</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  {isAdministrator && (
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => a.vehicle_class.localeCompare(b.vehicle_class))
                  .map((schedule) => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      isAdministrator={isAdministrator}
                      tdStyle={tdStyle}
                      onEdit={() => navigate(`/schedules/${schedule.id}/edit`)}
                      onDelete={() => {
                        setDeleteError(null);
                        setDeleteTarget(schedule);
                      }}
                      onClick={() => navigate(`/schedules/${schedule.id}`)}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => {
            if (!isDeleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
          title="Delete Schedule"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ margin: '0', fontSize: 'var(--font-size-body)', color: 'var(--color-body)' }}>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div
              style={{
                background: 'var(--color-canvas)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-ink)', fontSize: 'var(--font-size-small)' }}>
                {deleteTarget.vehicle_class} — {deleteTarget.km_interval.toLocaleString()} km / {deleteTarget.month_interval} months
              </div>
              <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>
                ID: {deleteTarget.id}
              </div>
            </div>
            {deleteError && (
              <Alert variant="error" message={deleteError} />
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ScheduleRowProps {
  schedule: Schedule;
  isAdministrator: boolean;
  tdStyle: React.CSSProperties;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function ScheduleRow({
  schedule,
  isAdministrator,
  tdStyle,
  onEdit,
  onDelete,
  onClick,
}: ScheduleRowProps): React.ReactElement {
  const [hovered, setHovered] = useState(false);

  const nameColor = schedule.is_active ? 'var(--color-ink)' : 'var(--color-muted)';
  const numColor = schedule.is_active ? 'var(--color-ink)' : 'var(--color-muted)';

  return (
    <tr
      onClick={onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: hovered ? 'var(--color-canvas)' : 'transparent',
        color: 'var(--color-on-surface)',
      }}
    >
      <td style={tdStyle}>
        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: nameColor }}>
          {schedule.vehicle_class}
        </div>
        <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
          ID: {schedule.id.slice(0, 8).toUpperCase()}
        </div>
      </td>
      <td style={tdStyle}>
        <VehicleClassBadge vehicleClass={schedule.vehicle_class} />
      </td>
      <td
        style={{
          ...tdStyle,
          textAlign: 'right',
          fontWeight: 'var(--font-weight-medium)',
          color: numColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {schedule.km_interval.toLocaleString()} km
      </td>
      <td
        style={{
          ...tdStyle,
          textAlign: 'right',
          fontWeight: 'var(--font-weight-medium)',
          color: numColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {schedule.month_interval} months
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <StatusBadge isActive={schedule.is_active} />
      </td>
      {isAdministrator && (
        <td style={{ ...tdStyle, textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                fontSize: 'var(--font-size-caption)',
                padding: 'var(--space-1) var(--space-3)',
                minHeight: '36px',
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--color-body)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                fontSize: 'var(--font-size-caption)',
                padding: 'var(--space-1) var(--space-3)',
                minHeight: '36px',
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--color-error)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Delete
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
