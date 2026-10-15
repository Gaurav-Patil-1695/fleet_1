import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVehicleTypes } from '../services/vehicleTypesService';
import { listDepots } from '../services/depotsService';
import { createVehicle } from '../services/vehiclesService';
import { getErrorMessage } from '../utils/errorUtils';
import type { VehicleCreate } from '../types/vehicle';
import type { VehicleType } from '../types/vehicleType';
import type { Depot } from '../types/depot';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

interface FormValues {
  make: string;
  model: string;
  registration_number: string;
  in_service_date: string;
  vehicle_type_id: string;
  depot_id: string;
  status: string;
  has_telematics: boolean;
}

interface FormErrors {
  make?: string;
  model?: string;
  registration_number?: string;
  in_service_date?: string;
  vehicle_type_id?: string;
  depot_id?: string;
  status?: string;
  has_telematics?: string;
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.make.trim() || values.make.length > 100) {
    errors.make = 'Vehicle make is required and must not exceed 100 characters.';
  }
  if (!values.model.trim() || values.model.length > 100) {
    errors.model = 'Vehicle model is required and must not exceed 100 characters.';
  }
  if (!values.registration_number.trim() || values.registration_number.length > 20) {
    errors.registration_number = 'Registration number is required and must not exceed 20 characters.';
  }
  if (!values.in_service_date) {
    errors.in_service_date = 'In-service date is required and must be a valid date.';
  }
  if (!values.vehicle_type_id || !UUID_RE.test(values.vehicle_type_id)) {
    errors.vehicle_type_id = 'Vehicle type ID must be a valid UUID.';
  }
  if (!values.depot_id || !UUID_RE.test(values.depot_id)) {
    errors.depot_id = 'Depot ID must be a valid UUID.';
  }
  if (values.status && values.status.length > 30) {
    errors.status = 'Status must not exceed 30 characters.';
  }

  return errors;
}

export default function AddVehiclePage(): React.ReactElement {
  const navigate = useNavigate();

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    make: '',
    model: '',
    registration_number: '',
    in_service_date: '',
    vehicle_type_id: '',
    depot_id: '',
    status: 'active',
    has_telematics: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [vtRes, depotRes] = await Promise.all([
        listVehicleTypes({ page: 1, pageSize: 200 }),
        listDepots({ page: 1, pageSize: 200 }),
      ]);
      setVehicleTypes(vtRes.data);
      setDepots(depotRes.data);
    } catch (err: unknown) {
      setOptionsError('Could not load form options. Please try again.');
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target;
    const { name, value } = target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormValues((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
    // Clear field error on change
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validate(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError('Vehicle could not be saved. Please check the form and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: VehicleCreate = {
        depot_id: formValues.depot_id,
        vehicle_type_id: formValues.vehicle_type_id,
        registration_number: formValues.registration_number.toUpperCase(),
        make: formValues.make,
        model: formValues.model,
        in_service_date: formValues.in_service_date,
        has_telematics: formValues.has_telematics,
        status: formValues.status as 'active' | 'inactive' | 'decommissioned',
      };

      const created = await createVehicle(body);
      navigate(`/vehicles/${created.id}`, {
        state: { toast: { message: 'Vehicle added successfully.', variant: 'success' } },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setSubmitError(msg || 'Vehicle could not be saved. Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

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

  const sectionLabelStyle: React.CSSProperties = {
    marginBottom: 'var(--space-4)',
    color: 'var(--color-muted)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    fontSize: 'var(--font-size-caption)',
    textTransform: 'uppercase',
    fontWeight: 'var(--font-weight-semibold)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
    marginBottom: 'var(--space-4)',
    color: 'var(--color-on-surface)',
  };

  const fieldStyle: React.CSSProperties = {
    flex: '1 1 180px',
    color: 'var(--color-on-surface)',
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
      <h1
        style={{
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--font-line-height-h1)',
          color: 'var(--color-ink)',
          margin: '0 0 var(--space-2) 0',
        }}
      >
        Add vehicle
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-6)',
          marginTop: '0',
        }}
      >
        Register a new vehicle to the fleet. All fields marked with * are required.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Main form card */}
        <div style={{ flex: '1 1 0', minWidth: '0' }}>
          {/* Options error banner */}
          {optionsError && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert variant="error" message={optionsError} />
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={loadOptions} disabled={optionsLoading}>
                  {optionsLoading ? 'Retrying…' : 'Retry'}
                </Button>
              </div>
            </div>
          )}

          {/* Submit error banner */}
          {submitError && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert variant="error" message={submitError} />
            </div>
          )}

          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              boxShadow: 'var(--elevation-2)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>
              {/* Section: Vehicle identity */}
              <p style={sectionLabelStyle}>Vehicle identity</p>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-make" style={fieldLabelStyle}>
                    Make *
                  </label>
                  <input
                    id="add-vehicle-make"
                    name="make"
                    type="text"
                    placeholder="e.g. Mercedes-Benz"
                    autoComplete="off"
                    value={formValues.make}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={formErrors.make ? inputErrorStyle : inputStyle}
                  />
                  {formErrors.make && (
                    <span style={fieldErrorStyle}>{formErrors.make}</span>
                  )}
                </div>

                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-model" style={fieldLabelStyle}>
                    Model *
                  </label>
                  <input
                    id="add-vehicle-model"
                    name="model"
                    type="text"
                    placeholder="e.g. Actros 1845"
                    autoComplete="off"
                    value={formValues.model}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={formErrors.model ? inputErrorStyle : inputStyle}
                  />
                  {formErrors.model && (
                    <span style={fieldErrorStyle}>{formErrors.model}</span>
                  )}
                </div>
              </div>

              <div style={{ ...rowStyle, marginBottom: 'var(--space-6)' }}>
                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-registration_number" style={fieldLabelStyle}>
                    Registration number *
                  </label>
                  <input
                    id="add-vehicle-registration_number"
                    name="registration_number"
                    type="text"
                    placeholder="e.g. AB12 CDE"
                    autoComplete="off"
                    value={formValues.registration_number}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={{
                      ...(formErrors.registration_number ? inputErrorStyle : inputStyle),
                      fontFamily: 'var(--font-family-mono)',
                      letterSpacing: 'var(--font-letter-spacing-wide)',
                      textTransform: 'uppercase',
                    }}
                  />
                  {formErrors.registration_number && (
                    <span style={fieldErrorStyle}>{formErrors.registration_number}</span>
                  )}
                </div>

                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-in_service_date" style={fieldLabelStyle}>
                    In-service date *
                  </label>
                  <input
                    id="add-vehicle-in_service_date"
                    name="in_service_date"
                    type="date"
                    value={formValues.in_service_date}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={formErrors.in_service_date ? inputErrorStyle : inputStyle}
                  />
                  {formErrors.in_service_date && (
                    <span style={fieldErrorStyle}>{formErrors.in_service_date}</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--color-border-subtle)',
                  marginBottom: 'var(--space-6)',
                }}
              />

              {/* Section: Classification & assignment */}
              <p style={sectionLabelStyle}>Classification &amp; assignment</p>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-vehicle_type_id" style={fieldLabelStyle}>
                    Vehicle type *
                  </label>
                  <select
                    id="add-vehicle-vehicle_type_id"
                    name="vehicle_type_id"
                    value={formValues.vehicle_type_id}
                    onChange={handleChange}
                    disabled={optionsLoading || !!optionsError || isSubmitting}
                    style={{
                      ...(formErrors.vehicle_type_id ? inputErrorStyle : inputStyle),
                      cursor: optionsLoading || !!optionsError ? 'not-allowed' : 'pointer',
                      opacity: optionsLoading || !!optionsError ? 0.7 : 1,
                    }}
                  >
                    <option value="" disabled>
                      {optionsLoading ? 'Loading…' : 'Select vehicle type'}
                    </option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.vehicle_type_id && (
                    <span style={fieldErrorStyle}>{formErrors.vehicle_type_id}</span>
                  )}
                </div>

                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-depot_id" style={fieldLabelStyle}>
                    Depot *
                  </label>
                  <select
                    id="add-vehicle-depot_id"
                    name="depot_id"
                    value={formValues.depot_id}
                    onChange={handleChange}
                    disabled={optionsLoading || !!optionsError || isSubmitting}
                    style={{
                      ...(formErrors.depot_id ? inputErrorStyle : inputStyle),
                      cursor: optionsLoading || !!optionsError ? 'not-allowed' : 'pointer',
                      opacity: optionsLoading || !!optionsError ? 0.7 : 1,
                    }}
                  >
                    <option value="" disabled>
                      {optionsLoading ? 'Loading…' : 'Select depot'}
                    </option>
                    {depots.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.depot_id && (
                    <span style={fieldErrorStyle}>{formErrors.depot_id}</span>
                  )}
                </div>
              </div>

              <div style={{ ...rowStyle, marginBottom: 'var(--space-6)' }}>
                <div style={fieldStyle}>
                  <label htmlFor="add-vehicle-status" style={fieldLabelStyle}>
                    Status *
                  </label>
                  <select
                    id="add-vehicle-status"
                    name="status"
                    value={formValues.status}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={formErrors.status ? inputErrorStyle : inputStyle}
                  >
                    <option value="" disabled>
                      Select status
                    </option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                  {formErrors.status && (
                    <span style={fieldErrorStyle}>{formErrors.status}</span>
                  )}
                </div>

                <div
                  style={{
                    ...fieldStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-canvas)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: 'var(--space-1)',
                      minHeight: 'var(--touch-target-min)',
                      color: 'var(--color-on-canvas)',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="add-vehicle-has_telematics"
                      name="has_telematics"
                      checked={formValues.has_telematics}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--color-primary)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ color: 'var(--color-on-canvas)' }}>
                      <label
                        htmlFor="add-vehicle-has_telematics"
                        style={{
                          fontSize: 'var(--font-size-small)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-body)',
                          cursor: 'pointer',
                          display: 'block',
                          lineHeight: 'var(--font-line-height-small)',
                        }}
                      >
                        Telematics fitted
                      </label>
                      <span
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--color-muted)',
                          lineHeight: 'var(--font-line-height-caption)',
                        }}
                      >
                        Vehicle has GPS / tracking unit installed
                      </span>
                    </div>
                  </div>
                  {formErrors.has_telematics && (
                    <span style={fieldErrorStyle}>{formErrors.has_telematics}</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--color-border-subtle)',
                  marginBottom: 'var(--space-5)',
                }}
              />

              {/* Form actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  color: 'var(--color-on-surface)',
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/vehicles')}
                  disabled={isSubmitting}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || optionsLoading || !!optionsError}
                  style={{ minWidth: '140px' }}
                >
                  {isSubmitting ? 'Saving…' : 'Add vehicle'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Help / guidance sidebar */}
        <div
          style={{
            flex: '0 0 260px',
            minWidth: '200px',
            maxWidth: '280px',
          }}
        >
          <div
            style={{
              padding: 'var(--space-5)',
              background: 'var(--color-info-light)',
              color: 'var(--color-on-info)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-4)',
              borderLeft: '4px solid var(--color-info)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-2)',
                color: 'var(--color-ink)',
                marginTop: '0',
              }}
            >
              📋 Before you begin
            </p>
            <ul
              style={{
                margin: '0',
                paddingLeft: 'var(--space-5)',
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-ink)',
                lineHeight: 'var(--font-line-height-body)',
              }}
            >
              <li style={{ marginBottom: 'var(--space-2)', color: 'var(--color-ink)' }}>
                Ensure the registration plate matches the V5C document exactly.
              </li>
              <li style={{ marginBottom: 'var(--space-2)', color: 'var(--color-ink)' }}>
                Select the depot the vehicle will be primarily based at.
              </li>
              <li style={{ color: 'var(--color-ink)' }}>
                Mark telematics only if the unit has been physically installed and configured.
              </li>
            </ul>
          </div>

          <div
            style={{
              padding: 'var(--space-5)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <p
              style={{
                color: 'var(--color-muted)',
                fontSize: 'var(--font-size-caption)',
                letterSpacing: 'var(--font-letter-spacing-caps)',
                textTransform: 'uppercase',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-3)',
                marginTop: '0',
              }}
            >
              Status guide
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                color: 'var(--color-on-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  color: 'var(--color-on-surface)',
                }}
              >
                <Badge variant="success">Active</Badge>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  In regular fleet operation
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  color: 'var(--color-on-surface)',
                }}
              >
                <Badge variant="neutral">Inactive</Badge>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Temporarily not in use
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  color: 'var(--color-on-surface)',
                }}
              >
                <Badge variant="error">Decommissioned</Badge>
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Permanently retired
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
