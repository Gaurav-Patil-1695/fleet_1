import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVehicle } from '../services/vehiclesService';
import { listVehicleReadings } from '../services/vehiclesService';
import { createReading } from '../services/readingsService';
import { getErrorMessage } from '../utils/errorUtils';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { formatOdometer } from '../utils/odometerUtils';
import type { Vehicle } from '../types/vehicle';
import type { Reading } from '../types/reading';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

function SkeletonBar(): React.ReactElement {
  return (
    <div
      style={{
        height: '88px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-raised)',
        boxShadow: 'var(--elevation-2)',
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

function sourceLabel(source: string): string {
  if (source === 'manual') return 'Manual';
  if (source === 'telematics') return 'Telematics';
  if (source === 'telematics_mock') return 'Telematics';
  return source;
}

function sourceBadgeVariant(source: string): 'info' | 'success' | 'neutral' {
  if (source === 'manual') return 'info';
  if (source === 'telematics' || source === 'telematics_mock') return 'success';
  return 'neutral';
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'neutral' | 'error' {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'warning';
  if (status === 'decommissioned') return 'error';
  return 'neutral';
}

function statusLabel(status: string): string {
  if (status === 'active') return 'In service';
  if (status === 'inactive') return 'Inactive';
  if (status === 'decommissioned') return 'Decommissioned';
  return status;
}

export default function ManualOdometerPage(): React.ReactElement {
  const navigate = useNavigate();
  const { id: vehicleId } = useParams<{ id: string }>();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [readings, setReadings] = useState<Reading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(true);

  const [odometerValue, setOdometerValue] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lowerThanLastWarning, setLowerThanLastWarning] = useState(false);
  const [confirmedLower, setConfirmedLower] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return;
    setVehicleLoading(true);
    setVehicleError(null);
    try {
      const v = await getVehicle(vehicleId);
      setVehicle(v);
    } catch {
      setVehicleError('Vehicle record could not be loaded');
    } finally {
      setVehicleLoading(false);
    }
  }, [vehicleId]);

  const loadReadings = useCallback(async () => {
    if (!vehicleId) return;
    setReadingsLoading(true);
    try {
      const res = await listVehicleReadings(vehicleId, { page: 1, page_size: 5 });
      setReadings(res.data.slice(0, 5));
    } catch {
      // non-critical — just show empty table
    } finally {
      setReadingsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadVehicle();
    loadReadings();
  }, [loadVehicle, loadReadings]);

  function handleOdometerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setOdometerValue(e.target.value);
    setFieldError(null);
    setFormError(null);
    setLowerThanLastWarning(false);
    setConfirmedLower(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);
    setLowerThanLastWarning(false);

    const trimmed = odometerValue.trim();
    if (trimmed === '') {
      setFieldError('A valid odometer reading is required');
      return;
    }

    const parsed = Number(trimmed);
    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      setFieldError('A valid odometer reading is required');
      return;
    }
    if (parsed < 0) {
      setFieldError('Reading must be greater than or equal to zero.');
      return;
    }

    const lastOdometer = vehicle?.last_known_odometer_km ?? null;
    if (
      lastOdometer !== null &&
      lastOdometer !== undefined &&
      parsed < lastOdometer &&
      !confirmedLower
    ) {
      setLowerThanLastWarning(true);
      return;
    }

    if (!vehicleId) {
      setFormError('Reading could not be saved. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReading({
        vehicle_id: vehicleId,
        odometer_km: parsed,
        source: 'manual',
        reading_timestamp: new Date().toISOString(),
        is_test_mode: false,
      });
      navigate(`/vehicles/${vehicleId}`, {
        state: { toast: { message: 'Odometer reading recorded.', variant: 'success' } },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setFormError(msg || 'Reading could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const now = new Date();
  const nowLabel = formatDateTime(now.toISOString());

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
          margin: '0 0 var(--space-2) 0',
        }}
      >
        Record Odometer Reading
      </h1>

      {/* Back link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/vehicles/${vehicleId}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M10 13L5 8l5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to vehicle detail
        </button>
      </div>

      {/* Vehicle Summary Bar */}
      {vehicleLoading && <SkeletonBar />}

      {!vehicleLoading && vehicleError && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--color-error-light)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            {vehicleError}
          </span>
          <button
            type="button"
            onClick={() => navigate(`/vehicles/${vehicleId}`)}
            style={{
              marginLeft: 'var(--space-4)',
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-small)',
              textDecoration: 'underline',
              padding: '0',
            }}
          >
            Go back
          </button>
        </div>
      )}

      {!vehicleLoading && !vehicleError && vehicle && (
        <div
          style={{
            background: 'var(--color-primary-dark)',
            color: 'var(--color-on-primary-dark)',
            padding: 'var(--space-5) var(--space-6)',
            marginBottom: 'var(--space-6)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-6)',
              flexWrap: 'wrap',
              color: 'var(--color-on-primary-dark)',
            }}
          >
            {/* Vehicle icon + registration */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--color-on-primary-dark)',
              }}
            >
              <div
                style={{
                  background: 'var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-on-primary)',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: 'var(--color-on-primary)' }}
                >
                  <path
                    d="M3 9l1.5-4.5h15L21 9M3 9v7a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1V9M3 9h18"
                    stroke="var(--color-on-primary)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="7.5" cy="13" r="1.25" fill="var(--color-on-primary)" />
                  <circle cx="16.5" cy="13" r="1.25" fill="var(--color-on-primary)" />
                </svg>
              </div>
              <div style={{ color: 'var(--color-on-primary-dark)' }}>
                <div
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 'var(--font-weight-semibold)',
                    letterSpacing: 'var(--font-letter-spacing-caps)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--space-1)',
                    color: 'var(--color-on-primary-dark)',
                  }}
                >
                  Registration
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-on-primary-dark)',
                    fontFamily: 'var(--font-family-mono)',
                    letterSpacing: 'var(--font-letter-spacing-wide)',
                  }}
                >
                  {vehicle.registration_number}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '40px',
                background: 'var(--color-surface)',
                flexShrink: 0,
              }}
            />

            {/* Make & Model */}
            <div style={{ color: 'var(--color-on-primary-dark)' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: 'var(--font-letter-spacing-caps)',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--space-1)',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                Make &amp; Model
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                {vehicle.make} {vehicle.model}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '40px',
                background: 'var(--color-surface)',
                flexShrink: 0,
              }}
            />

            {/* Last odometer */}
            <div style={{ color: 'var(--color-on-primary-dark)' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: 'var(--font-letter-spacing-caps)',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--space-1)',
                  color: 'var(--color-on-primary-dark)',
                }}
              >
                Last recorded odometer
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-on-primary-dark)',
                  fontFamily: 'var(--font-family-mono)',
                }}
              >
                {vehicle.last_known_odometer_km != null
                  ? formatOdometer(vehicle.last_known_odometer_km)
                  : '—'}
              </div>
            </div>

            {/* Status badge */}
            <div style={{ marginLeft: 'auto', color: 'var(--color-on-primary-dark)' }}>
              <Badge variant={statusBadgeVariant(vehicle.status)}>
                {statusLabel(vehicle.status)}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Main content area — only render form when vehicle is loaded */}
      {!vehicleLoading && !vehicleError && vehicle && (
        <div style={{ maxWidth: 'var(--content-narrow-width)' }}>
          {/* Main Form Card */}
          <div
            style={{
              padding: 'var(--space-8)',
              background: 'var(--color-surface)',
              boxShadow: 'var(--elevation-2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-on-surface)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-6)',
                  color: 'var(--color-on-surface)',
                }}
              >
                {/* Heading */}
                <div style={{ color: 'var(--color-on-surface)' }}>
                  <h2
                    style={{
                      fontSize: 'var(--font-size-h2)',
                      fontWeight: 'var(--font-weight-h2)',
                      lineHeight: 'var(--font-line-height-h2)',
                      color: 'var(--color-ink)',
                      margin: '0 0 var(--space-1) 0',
                    }}
                  >
                    Enter current odometer reading
                  </h2>
                  <p
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-muted)',
                      margin: '0',
                    }}
                  >
                    Enter the exact reading shown on the vehicle&apos;s instrument cluster. This
                    reading is recorded with a{' '}
                    <strong style={{ color: 'var(--color-on-surface)' }}>manual</strong> source
                    tag.
                  </p>
                </div>

                {/* Top-of-form API error banner */}
                {formError && (
                  <Alert variant="error" message={formError} />
                )}

                {/* Reference info strip */}
                {vehicle.last_known_odometer_km != null && (
                  <div
                    style={{
                      background: 'var(--color-canvas)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      color: 'var(--color-on-canvas)',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ flexShrink: 0, color: 'var(--color-ink)' }}
                    >
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                      <path
                        d="M12 11v5M12 8h.01"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-body)',
                      }}
                    >
                      Last recorded value:{' '}
                      <strong
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {formatOdometer(vehicle.last_known_odometer_km)}
                      </strong>
                      {vehicle.last_odometer_recorded_at && (
                        <>
                          {' '}— recorded on{' '}
                          <strong style={{ color: 'var(--color-ink)' }}>
                            {formatDate(vehicle.last_odometer_recorded_at)}
                          </strong>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Odometer input */}
                <div
                  style={{
                    marginBottom: '0',
                    color: 'var(--color-on-surface)',
                  }}
                >
                  <label
                    htmlFor="manual-odometer-entry-odometer-reading"
                    style={{
                      fontSize: 'var(--font-size-small)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-ink)',
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Current odometer reading{' '}
                    <span style={{ color: 'var(--color-ink)' }}>*</span>
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      maxWidth: '320px',
                      border: fieldError
                        ? '1.5px solid var(--color-error)'
                        : '1.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: 'var(--color-surface)',
                      boxShadow: 'var(--elevation-1)',
                    }}
                  >
                    <input
                      id="manual-odometer-entry-odometer-reading"
                      type="number"
                      min="0"
                      placeholder="e.g. 143 500"
                      value={odometerValue}
                      onChange={handleOdometerChange}
                      disabled={isSubmitting}
                      style={{
                        border: 'none',
                        borderRadius: '0',
                        flex: '1',
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: 'var(--font-size-h3)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--font-letter-spacing-wide)',
                        color: 'var(--color-ink)',
                        background: 'transparent',
                        outline: 'none',
                        padding: 'var(--space-4)',
                        minHeight: 'var(--touch-target-min)',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div
                      style={{
                        background: 'var(--color-canvas)',
                        borderLeft: '1px solid var(--color-border-subtle)',
                        padding: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--color-on-canvas)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--font-size-small)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-muted)',
                          letterSpacing: 'var(--font-letter-spacing-caps)',
                          textTransform: 'uppercase',
                        }}
                      >
                        km
                      </span>
                    </div>
                  </div>
                  {fieldError && (
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-error)',
                        margin: 'var(--space-2) 0 0 0',
                      }}
                    >
                      {fieldError}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      margin: 'var(--space-2) 0 0 0',
                    }}
                  >
                    Enter whole kilometres. Do not include decimal points or units.
                  </p>
                </div>

                {/* Lower-than-last warning */}
                {lowerThanLastWarning && (
                  <div
                    style={{
                      background: 'var(--color-warning-light)',
                      border: '1px solid var(--color-warning)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ flexShrink: 0, color: 'var(--color-warning)' }}
                      >
                        <path
                          d="M12 9v4M12 16h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span
                        style={{
                          fontSize: 'var(--font-size-small)',
                          color: 'var(--color-ink)',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        This reading is lower than the last recorded value. Do you want to continue?
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setConfirmedLower(true);
                          setLowerThanLastWarning(false);
                        }}
                        style={{ fontSize: 'var(--font-size-small)' }}
                      >
                        Yes, continue
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setLowerThanLastWarning(false);
                          setOdometerValue('');
                        }}
                        style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Date/Time hint */}
                <div
                  style={{
                    background: 'var(--color-info-light)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3) var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ flexShrink: 0, color: 'var(--color-on-info)' }}
                  >
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.75" />
                    <path
                      d="M3 9h18M8 2v4M16 2v4"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-on-info)',
                    }}
                  >
                    Reading timestamp will be set to{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>now</strong> — {nowLabel}
                  </span>
                </div>

                {/* Divider */}
                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--color-border-subtle)',
                    margin: '0',
                  }}
                />

                {/* Action row */}
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    color: 'var(--color-on-surface)',
                  }}
                >
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    style={{
                      minWidth: '180px',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    {isSubmitting ? (
                      'Saving…'
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ verticalAlign: 'middle' }}
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Save reading
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(`/vehicles/${vehicleId}`)}
                    disabled={isSubmitting}
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Cancel
                  </Button>
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      marginLeft: 'auto',
                      color: 'var(--color-muted)',
                    }}
                  >
                    Source:{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>Manual entry</strong>
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Recent readings mini-table */}
          <div
            style={{
              padding: 'var(--space-6)',
              marginTop: 'var(--space-6)',
              background: 'var(--color-surface)',
              boxShadow: 'var(--elevation-1)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-on-surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
                color: 'var(--color-on-surface)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--font-size-h3)',
                  fontWeight: 'var(--font-weight-h3)',
                  color: 'var(--color-ink)',
                  margin: '0',
                }}
              >
                Recent readings
              </h3>
              <button
                type="button"
                onClick={() => navigate(`/vehicles/${vehicleId}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-primary)',
                  padding: 'var(--space-1) var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                View all
              </button>
            </div>

            {readingsLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 'var(--space-6)',
                }}
              >
                <Spinner size="md" />
              </div>
            ) : readings.length === 0 ? (
              <p
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-muted)',
                  textAlign: 'center',
                  padding: 'var(--space-6) 0',
                  margin: '0',
                }}
              >
                No readings recorded yet.
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-on-surface)',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--color-border-subtle)',
                    }}
                  >
                    <th
                      style={{
                        textAlign: 'left',
                        padding: 'var(--space-2) var(--space-3) var(--space-2) 0',
                        color: 'var(--color-muted)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--font-letter-spacing-caps)',
                        fontSize: 'var(--font-size-caption)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: 'var(--space-2) var(--space-3)',
                        color: 'var(--color-muted)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--font-letter-spacing-caps)',
                        fontSize: 'var(--font-size-caption)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Reading (km)
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-2) var(--space-3)',
                        color: 'var(--color-muted)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--font-letter-spacing-caps)',
                        fontSize: 'var(--font-size-caption)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Source
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: 'var(--space-2) 0 var(--space-2) var(--space-3)',
                        color: 'var(--color-muted)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--font-letter-spacing-caps)',
                        fontSize: 'var(--font-size-caption)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Recorded by
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, idx) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom:
                          idx < readings.length - 1
                            ? '1px solid var(--color-border-subtle)'
                            : 'none',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-3) var(--space-3) 0',
                          color: 'var(--color-body)',
                        }}
                      >
                        {formatDate(r.reading_timestamp)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: 'var(--space-3)',
                          fontFamily: 'var(--font-family-mono)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {r.odometer_km.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: 'var(--space-3)',
                        }}
                      >
                        <Badge variant={sourceBadgeVariant(r.source)}>
                          {sourceLabel(r.source)}
                        </Badge>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: 'var(--space-3) 0 var(--space-3) var(--space-3)',
                          color: r.recorded_by_user_id ? 'var(--color-body)' : 'var(--color-muted)',
                          fontStyle: r.recorded_by_user_id ? 'normal' : 'italic',
                        }}
                      >
                        {r.recorded_by_user_id ? r.recorded_by_user_id : 'Auto'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
