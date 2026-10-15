import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSchedule, updateSchedule } from '../services/schedulesService';
import { getVehicleType } from '../services/vehicleTypesService';
import { getErrorMessage } from '../utils/errorUtils';
import { formatDate } from '../utils/dateUtils';
import type { Schedule, ScheduleUpdate } from '../types/schedule';
import type { VehicleType } from '../types/vehicleType';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

interface FormValues {
  km_interval: string;
  month_interval: string;
  is_active: boolean;
}

interface FormErrors {
  km_interval?: string;
  month_interval?: string;
  is_active?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const km = parseInt(values.km_interval, 10);
  if (values.km_interval === '' || isNaN(km) || km < 1 || !Number.isInteger(km)) {
    errors.km_interval = 'Kilometre interval must be a positive whole number.';
  }

  const mo = parseInt(values.month_interval, 10);
  if (values.month_interval === '' || isNaN(mo) || mo < 1 || !Number.isInteger(mo)) {
    errors.month_interval = 'Month interval must be a positive whole number.';
  }

  return errors;
}

function vehicleClassLabel(cls: string): string {
  switch (cls) {
    case 'heavy_truck':
      return 'Heavy Truck';
    case 'light_commercial':
      return 'Light Commercial';
    case 'other':
      return 'Other';
    default:
      return cls;
  }
}

export default function EditSchedulePage(): React.ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    km_interval: '',
    month_interval: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const sch = await getSchedule(id);
      setSchedule(sch);
      setFormValues({
        km_interval: String(sch.km_interval),
        month_interval: String(sch.month_interval),
        is_active: sch.is_active,
      });
      // Fetch vehicle type info for display
      try {
        const vt = await getVehicleType(sch.vehicle_type_id);
        setVehicleType(vt);
      } catch {
        // Non-fatal; vehicle type name will fall back to ID
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      // Check for 404
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        navigate('/not-found', { replace: true });
        return;
      }
      setFetchError('Unable to load schedule for editing — please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  function handleKmChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((prev) => ({ ...prev, km_interval: e.target.value }));
    setFormErrors((prev) => ({ ...prev, km_interval: undefined }));
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((prev) => ({ ...prev, month_interval: e.target.value }));
    setFormErrors((prev) => ({ ...prev, month_interval: undefined }));
  }

  function handleActiveChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((prev) => ({ ...prev, is_active: e.target.checked }));
    setFormErrors((prev) => ({ ...prev, is_active: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validate(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!id) return;

    setIsSubmitting(true);
    try {
      const body: ScheduleUpdate = {
        km_interval: parseInt(formValues.km_interval, 10),
        month_interval: parseInt(formValues.month_interval, 10),
        is_active: formValues.is_active,
      };

      await updateSchedule(id, body);
      navigate(`/schedules/${id}`, {
        state: { toast: { message: 'Schedule updated successfully', variant: 'success' } },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setSubmitError(msg || 'An error occurred while saving the schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const vehicleTypeName = vehicleType?.name ?? schedule?.vehicle_type_id ?? '—';
  const vehicleClassDisplay = schedule ? vehicleClassLabel(schedule.vehicle_class) : '—';

  const sectionLabelStyle: React.CSSProperties = {
    marginBottom: 'var(--space-4)',
    color: 'var(--color-muted)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    fontSize: 'var(--font-size-caption)',
    textTransform: 'uppercase',
    fontWeight: 'var(--font-weight-semibold)',
  };

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-body)',
    marginBottom: 'var(--space-1)',
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--space-2) var(--space-3)',
    paddingRight: 'var(--space-10)',
    fontSize: 'var(--font-size-body)',
    color: 'var(--color-body)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    minHeight: 'var(--touch-target-min)',
    outline: 'none',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid var(--color-error)',
  };

  const fieldErrorStyle: React.CSSProperties = {
    display: 'block',
    marginTop: 'var(--space-1)',
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-error)',
  };

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Page heading */}
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-1) 0',
        }}
      >
        Edit Service Schedule
      </h1>
      {schedule && (
        <p
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 'var(--font-weight-h2)',
            color: 'var(--color-muted)',
            marginBottom: 'var(--space-6)',
            marginTop: '0',
            lineHeight: 'var(--font-line-height-h2)',
          }}
        >
          {vehicleTypeName} — {vehicleClassDisplay}
        </p>
      )}

      <div style={{ maxWidth: 'var(--content-narrow-width)' }}>
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-muted)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Link
            to="/schedules"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            Schedules
          </Link>
          <span style={{ color: 'var(--color-ink)' }}>›</span>
          {id && (
            <>
              <Link
                to={`/schedules/${id}`}
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                {id.slice(0, 8).toUpperCase()}
              </Link>
              <span style={{ color: 'var(--color-ink)' }}>›</span>
            </>
          )}
          <span style={{ color: 'var(--color-muted)' }}>Edit</span>
        </nav>

        {/* Fetch error */}
        {!isLoading && fetchError && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <Alert variant="error" message={fetchError} />
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button variant="secondary" onClick={loadSchedule}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              padding: 'var(--space-8)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elevation-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              color: 'var(--color-muted)',
            }}
          >
            <Spinner size="md" />
            <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
              Loading schedule…
            </span>
          </div>
        )}

        {/* Form card */}
        {!isLoading && !fetchError && schedule && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Submit error banner */}
            {submitError && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <Alert variant="error" message={submitError} />
              </div>
            )}

            <div
              style={{
                padding: 'var(--space-8)',
                background: 'var(--color-surface)',
                color: 'var(--color-on-surface)',
                boxShadow: 'var(--elevation-2)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {/* Section: Vehicle Identity (read-only) */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <p style={sectionLabelStyle}>Vehicle Identity</p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-4)',
                  }}
                >
                  {/* Vehicle Type */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--font-size-small)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      Vehicle type
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-canvas)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        minHeight: 'var(--touch-target-min)',
                        color: 'var(--color-on-canvas)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--color-ink)',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        {vehicleTypeName}
                      </span>
                      <Badge variant="neutral" style={{ marginLeft: 'auto' }}>
                        Read-only
                      </Badge>
                    </div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-muted)',
                        lineHeight: 'var(--font-line-height-caption)',
                        margin: '0',
                      }}
                    >
                      Changing vehicle type would alter the schedule's identity. Create a new
                      schedule instead.
                    </p>
                  </div>

                  {/* Vehicle Class */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--font-size-small)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      Vehicle class
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-canvas)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        minHeight: 'var(--touch-target-min)',
                        color: 'var(--color-on-canvas)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--color-ink)',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        {vehicleClassDisplay}
                      </span>
                      <Badge variant="neutral" style={{ marginLeft: 'auto' }}>
                        Read-only
                      </Badge>
                    </div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-muted)',
                        lineHeight: 'var(--font-line-height-caption)',
                        margin: '0',
                      }}
                    >
                      Derived from the vehicle type classification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--color-border-subtle)',
                  marginBottom: 'var(--space-8)',
                }}
              />

              {/* Section: Service Intervals */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <p style={sectionLabelStyle}>Service intervals</p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-4)',
                  }}
                >
                  {/* KM Interval */}
                  <div>
                    <label
                      htmlFor="edit-schedule-km_interval"
                      style={fieldLabelStyle}
                    >
                      KM interval
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="edit-schedule-km_interval"
                        name="km_interval"
                        type="number"
                        min={1}
                        value={formValues.km_interval}
                        onChange={handleKmChange}
                        disabled={isSubmitting}
                        style={formErrors.km_interval ? inputErrorStyle : inputStyle}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 'var(--space-3)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 'var(--font-size-small)',
                          color: 'var(--color-muted)',
                          pointerEvents: 'none',
                        }}
                      >
                        km
                      </span>
                    </div>
                    {formErrors.km_interval && (
                      <span style={fieldErrorStyle}>{formErrors.km_interval}</span>
                    )}
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-muted)',
                        marginTop: 'var(--space-1)',
                        marginBottom: '0',
                        lineHeight: 'var(--font-line-height-caption)',
                      }}
                    >
                      Service is triggered when odometer exceeds this distance since last service.
                    </p>
                  </div>

                  {/* Month Interval */}
                  <div>
                    <label
                      htmlFor="edit-schedule-month_interval"
                      style={fieldLabelStyle}
                    >
                      Month interval
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="edit-schedule-month_interval"
                        name="month_interval"
                        type="number"
                        min={1}
                        value={formValues.month_interval}
                        onChange={handleMonthChange}
                        disabled={isSubmitting}
                        style={{
                          ...(formErrors.month_interval ? inputErrorStyle : inputStyle),
                          paddingRight: 'var(--space-12)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 'var(--space-3)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 'var(--font-size-small)',
                          color: 'var(--color-muted)',
                          pointerEvents: 'none',
                        }}
                      >
                        months
                      </span>
                    </div>
                    {formErrors.month_interval && (
                      <span style={fieldErrorStyle}>{formErrors.month_interval}</span>
                    )}
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-muted)',
                        marginTop: 'var(--space-1)',
                        marginBottom: '0',
                        lineHeight: 'var(--font-line-height-caption)',
                      }}
                    >
                      Service is triggered when this duration elapses since last service date.
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--color-border-subtle)',
                  marginBottom: 'var(--space-8)',
                }}
              />

              {/* Section: Schedule Status */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <p style={sectionLabelStyle}>Schedule status</p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-5)',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-on-canvas)',
                  }}
                >
                  {/* Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      flexShrink: 0,
                    }}
                  >
                    <label
                      htmlFor="edit-schedule-is_active"
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '48px',
                        height: '26px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        id="edit-schedule-is_active"
                        name="is_active"
                        checked={formValues.is_active}
                        onChange={handleActiveChange}
                        disabled={isSubmitting}
                        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                      />
                      <span
                        style={{
                          display: 'block',
                          background: formValues.is_active
                            ? 'var(--color-success)'
                            : 'var(--color-disabled)',
                          borderRadius: 'var(--radius-full)',
                          width: '48px',
                          height: '26px',
                          transition: 'background 0.2s',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '3px',
                            left: formValues.is_active ? '22px' : '2px',
                            width: '20px',
                            height: '20px',
                            background: 'var(--color-white)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'left 0.2s',
                            boxShadow: 'var(--elevation-1)',
                          }}
                        />
                      </span>
                    </label>
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      {formValues.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Description */}
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-ink)',
                        marginBottom: 'var(--space-1)',
                        marginTop: '0',
                      }}
                    >
                      Mark this schedule as active
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                        lineHeight: 'var(--font-line-height-small)',
                        margin: '0',
                      }}
                    >
                      Only one schedule can be active per vehicle type at a time. Activating this
                      schedule will require deactivating any conflicting schedule first. Deactivating
                      will stop this schedule from triggering new service events.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current record info */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-6)',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--color-info-light)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--space-8)',
                  color: 'var(--color-ink)',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    Schedule ID
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-small)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-family-mono)',
                    }}
                  >
                    {schedule.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    Created
                  </span>
                  <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-ink)' }}>
                    {formatDate(schedule.created_at)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    Last updated
                  </span>
                  <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-ink)' }}>
                    {formatDate(schedule.updated_at)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--font-letter-spacing-caps)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    Status
                  </span>
                  <Badge variant={schedule.is_active ? 'success' : 'neutral'}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--color-primary-dark)',
                    color: 'var(--color-on-primary-dark)',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 var(--space-6)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/schedules/${id}`)}
                  disabled={isSubmitting}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    color: 'var(--color-body)',
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
