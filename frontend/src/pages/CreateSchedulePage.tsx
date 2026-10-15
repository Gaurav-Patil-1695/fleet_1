import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVehicleTypes } from '../services/vehicleTypesService';
import { createSchedule } from '../services/schedulesService';
import { getErrorMessage } from '../utils/errorUtils';
import type { VehicleType } from '../types/vehicleType';
import type { ScheduleCreate } from '../types/schedule';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface FormValues {
  vehicle_type_id: string;
  vehicle_class: string;
  km_interval: string;
  month_interval: string;
  is_active: boolean;
}

interface FormErrors {
  vehicle_type_id?: string;
  vehicle_class?: string;
  km_interval?: string;
  month_interval?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.vehicle_type_id || !UUID_RE.test(values.vehicle_type_id)) {
    errors.vehicle_type_id = 'Vehicle type ID must be a valid UUID.';
  }
  if (!values.vehicle_class || values.vehicle_class.length > 50) {
    errors.vehicle_class = 'Vehicle class is required and must not exceed 50 characters.';
  }
  const km = parseInt(values.km_interval, 10);
  if (!values.km_interval || isNaN(km) || km < 1 || !Number.isInteger(km)) {
    errors.km_interval = 'Kilometre interval is required and must be a positive whole number.';
  }
  const months = parseInt(values.month_interval, 10);
  if (!values.month_interval || isNaN(months) || months < 1 || !Number.isInteger(months)) {
    errors.month_interval = 'Month interval is required and must be a positive whole number.';
  }

  return errors;
}

export default function CreateSchedulePage(): React.ReactElement {
  const navigate = useNavigate();

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    vehicle_type_id: '',
    vehicle_class: '',
    km_interval: '',
    month_interval: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadVehicleTypes = useCallback(async () => {
    setTypesLoading(true);
    setTypesError(null);
    try {
      const res = await listVehicleTypes({ page: 1, pageSize: 200 });
      setVehicleTypes(res.data);
    } catch (err: unknown) {
      setTypesError('Could not load vehicle types');
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicleTypes();
  }, [loadVehicleTypes]);

  function handleVehicleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value;
    const selected = vehicleTypes.find((vt) => vt.id === selectedId);
    setFormValues((prev) => ({
      ...prev,
      vehicle_type_id: selectedId,
      vehicle_class: selected ? selected.vehicle_class : '',
    }));
    setFormErrors((prev) => ({ ...prev, vehicle_type_id: undefined, vehicle_class: undefined }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const target = e.target;
    const { name, value } = target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormValues((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((prev) => ({ ...prev, is_active: e.target.checked }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validate(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError('Failed to save schedule — please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: ScheduleCreate = {
        vehicle_type_id: formValues.vehicle_type_id,
        vehicle_class: formValues.vehicle_class as 'heavy_truck' | 'light_commercial' | 'other',
        km_interval: parseInt(formValues.km_interval, 10),
        month_interval: parseInt(formValues.month_interval, 10),
        is_active: formValues.is_active,
      };

      const created = await createSchedule(body);
      navigate(`/schedules/${created.id}`, {
        state: { toast: { message: 'Schedule created successfully.', variant: 'success' } },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setSubmitError(msg || 'Failed to save schedule — please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedType = vehicleTypes.find((vt) => vt.id === formValues.vehicle_type_id);

  const vehicleClassLabel = selectedType
    ? selectedType.vehicle_class === 'heavy_truck'
      ? 'Heavy Truck'
      : selectedType.vehicle_class === 'light_commercial'
      ? 'Light Commercial'
      : 'Other'
    : null;

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-body)',
    marginBottom: 'var(--space-1)',
    fontSize: 'var(--font-size-body)',
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--space-2) var(--space-3)',
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

  const captionStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-muted)',
    marginTop: 'var(--space-1)',
  };

  const captionErrorStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-error)',
    marginTop: 'var(--space-1)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  };

  return (
    <div
      style={{
        maxWidth: 'var(--content-narrow-width)',
        margin: '0 auto',
        padding: 'var(--space-6)',
        color: 'var(--color-on-canvas)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-6) 0',
        }}
      >
        New Service Schedule
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-muted)',
          }}
        >
          <span
            onClick={() => navigate('/schedules')}
            style={{
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Schedules
          </span>
          <span>›</span>
          <span style={{ color: 'var(--color-muted)' }}>New schedule</span>
        </nav>

        {/* Submit error banner */}
        {submitError && (
          <div>
            <Alert variant="error" message={submitError} />
          </div>
        )}

        {/* Form card */}
        <div
          style={{
            boxShadow: 'var(--elevation-1)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-8)',
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Section header */}
              <div
                style={{
                  borderBottom: '1px solid var(--color-border-subtle)',
                  paddingBottom: 'var(--space-4)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 var(--space-1) 0',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-small)',
                    letterSpacing: 'var(--font-letter-spacing-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--color-muted)',
                  }}
                >
                  Schedule details
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-small)',
                    color: 'var(--color-muted)',
                    margin: '0',
                  }}
                >
                  Define the service interval for a specific vehicle type. Both a kilometre and a
                  month threshold must be provided — whichever is reached first triggers a service
                  alert.
                </p>
              </div>

              {/* Vehicle Type */}
              <div>
                <label
                  htmlFor="create-schedule-vehicle_type_id"
                  style={fieldLabelStyle}
                >
                  Vehicle type
                  <span
                    style={{
                      color: 'var(--color-error)',
                      marginLeft: 'var(--space-1)',
                    }}
                    aria-hidden="true"
                  >
                    *
                  </span>
                </label>

                {typesError ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-error-light)',
                      color: 'var(--color-error)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-small)',
                      border: '1px solid var(--color-error)',
                    }}
                  >
                    <span aria-hidden="true">⚠</span>
                    <span>Could not load vehicle types</span>
                    <button
                      type="button"
                      onClick={loadVehicleTypes}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0',
                        color: 'var(--color-error)',
                        fontWeight: 'var(--font-weight-semibold)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: 'var(--font-size-small)',
                        marginLeft: 'var(--space-2)',
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <select
                    id="create-schedule-vehicle_type_id"
                    name="vehicle_type_id"
                    value={formValues.vehicle_type_id}
                    onChange={handleVehicleTypeChange}
                    disabled={typesLoading || isSubmitting}
                    style={{
                      ...(formErrors.vehicle_type_id ? inputErrorStyle : inputStyle),
                      cursor: typesLoading ? 'not-allowed' : 'pointer',
                      opacity: typesLoading ? 0.7 : 1,
                    }}
                  >
                    <option value="" disabled>
                      {typesLoading ? 'Loading vehicle types…' : 'Select a vehicle type…'}
                    </option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                  </select>
                )}

                {formErrors.vehicle_type_id && (
                  <div style={captionErrorStyle}>
                    <span aria-hidden="true">⚠</span>
                    <span>{formErrors.vehicle_type_id}</span>
                  </div>
                )}
                {!formErrors.vehicle_type_id && (
                  <div style={captionStyle}>
                    Each vehicle type can have only one active schedule at a time.
                  </div>
                )}
              </div>

              {/* Vehicle Class (read-only, derived) */}
              <div>
                <label style={fieldLabelStyle}>Vehicle class</label>
                <div
                  style={{
                    background: 'var(--color-canvas)',
                    color: 'var(--color-muted)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0 var(--space-3)',
                    height: 'var(--touch-target-min)',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 'var(--font-size-body)',
                    fontStyle: vehicleClassLabel ? 'normal' : 'italic',
                  }}
                >
                  {vehicleClassLabel ?? 'Populated automatically when a vehicle type is selected'}
                </div>
                <input
                  type="hidden"
                  name="vehicle_class"
                  id="create-schedule-vehicle_class"
                  value={formValues.vehicle_class}
                />
                <div style={captionStyle}>Derived from the selected vehicle type — not editable.</div>
              </div>

              {/* Interval row */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-6)',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                {/* KM Interval */}
                <div style={{ flex: '1', minWidth: '0' }}>
                  <label
                    htmlFor="create-schedule-km_interval"
                    style={fieldLabelStyle}
                  >
                    Kilometre interval
                    <span
                      style={{ color: 'var(--color-error)', marginLeft: 'var(--space-1)' }}
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      id="create-schedule-km_interval"
                      name="km_interval"
                      type="number"
                      min="1"
                      step="500"
                      placeholder="e.g. 15000"
                      value={formValues.km_interval}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{
                        ...(formErrors.km_interval ? inputErrorStyle : inputStyle),
                        paddingRight: 'var(--space-8)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      km
                    </span>
                  </div>
                  {formErrors.km_interval ? (
                    <div style={captionErrorStyle}>
                      <span aria-hidden="true">⚠</span>
                      <span>{formErrors.km_interval}</span>
                    </div>
                  ) : (
                    <div style={captionStyle}>Minimum: 1 km</div>
                  )}
                </div>

                {/* Month Interval */}
                <div style={{ flex: '1', minWidth: '0' }}>
                  <label
                    htmlFor="create-schedule-month_interval"
                    style={fieldLabelStyle}
                  >
                    Month interval
                    <span
                      style={{ color: 'var(--color-error)', marginLeft: 'var(--space-1)' }}
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      id="create-schedule-month_interval"
                      name="month_interval"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 6"
                      value={formValues.month_interval}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{
                        ...(formErrors.month_interval ? inputErrorStyle : inputStyle),
                        paddingRight: 'var(--space-10)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 'var(--space-3)',
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      months
                    </span>
                  </div>
                  {formErrors.month_interval ? (
                    <div style={captionErrorStyle}>
                      <span aria-hidden="true">⚠</span>
                      <span>{formErrors.month_interval}</span>
                    </div>
                  ) : (
                    <div style={captionStyle}>Minimum: 1 month</div>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4) var(--space-5)',
                  color: 'var(--color-on-canvas)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-body)',
                      fontSize: 'var(--font-size-body)',
                    }}
                  >
                    Active
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-muted)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    When active, this schedule generates service alerts for matching vehicles.
                  </div>
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginLeft: 'var(--space-6)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {formValues.is_active ? 'On' : 'Off'}
                  </span>
                  <div style={{ position: 'relative', width: '48px', height: '26px' }}>
                    <input
                      type="checkbox"
                      id="create-schedule-is_active"
                      name="is_active"
                      checked={formValues.is_active}
                      onChange={handleToggle}
                      disabled={isSubmitting}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0,
                        position: 'absolute',
                      }}
                    />
                    <div
                      style={{
                        width: '48px',
                        height: '26px',
                        background: formValues.is_active
                          ? 'var(--color-primary-dark)'
                          : 'var(--color-disabled)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 var(--space-1)',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => {
                        if (!isSubmitting) {
                          setFormValues((prev) => ({ ...prev, is_active: !prev.is_active }));
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          background: 'var(--color-white)',
                          borderRadius: 'var(--radius-full)',
                          boxShadow: 'var(--elevation-1)',
                          transition: 'transform 0.2s',
                          transform: formValues.is_active
                            ? 'translateX(22px)'
                            : 'translateX(0)',
                        }}
                      />
                    </div>
                  </div>
                </label>
              </div>

              {/* Divider */}
              <div
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
              />

              {/* Actions */}
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
                  disabled={isSubmitting || !!typesError}
                  style={{
                    background: 'var(--color-primary-dark)',
                    color: 'var(--color-on-primary-dark)',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 var(--space-8)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-body)',
                  }}
                >
                  {isSubmitting ? 'Saving…' : 'Save schedule'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/schedules')}
                  disabled={isSubmitting}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 var(--space-5)',
                    color: 'var(--color-muted)',
                  }}
                >
                  Cancel
                </Button>
                <span style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-error)' }}>*</span> Required fields
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Info note */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            alignItems: 'flex-start',
            background: 'var(--color-info-light)',
            color: 'var(--color-on-info)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-5)',
            fontSize: 'var(--font-size-small)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-h3)',
              flexShrink: 0,
              marginTop: '2px',
              color: 'var(--color-ink)',
            }}
          >
            ℹ️
          </span>
          <div style={{ color: 'var(--color-ink)' }}>
            <strong
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-ink)',
              }}
            >
              How intervals work
            </strong>
            FleetOps triggers a service alert when either the kilometre OR the month threshold is
            reached — whichever comes first. Vehicles without an assigned schedule will not generate
            automatic alerts.
          </div>
        </div>
      </div>
    </div>
  );
}
