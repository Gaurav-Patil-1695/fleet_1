import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVehicle, updateVehicle, deleteVehicle } from '../services/vehiclesService';
import { listVehicleTypes } from '../services/vehicleTypesService';
import { listDepots } from '../services/depotsService';
import { getErrorMessage } from '../utils/errorUtils';
import { formatDateTime } from '../utils/dateUtils';
import type { Vehicle, VehicleUpdate } from '../types/vehicle';
import type { VehicleType } from '../types/vehicleType';
import type { Depot } from '../types/depot';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface FormValues {
  registration_number: string;
  make: string;
  model: string;
  vehicle_type_id: string;
  depot_id: string;
  status: string;
  in_service_date: string;
  has_telematics: boolean;
}

interface FormErrors {
  registration_number?: string;
  make?: string;
  model?: string;
  vehicle_type_id?: string;
  depot_id?: string;
  status?: string;
  in_service_date?: string;
  has_telematics?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (values.registration_number.length > 20) {
    errors.registration_number = 'Registration number must not exceed 20 characters.';
  }
  if (values.make.length > 100) {
    errors.make = 'Vehicle make must not exceed 100 characters.';
  }
  if (values.model.length > 100) {
    errors.model = 'Vehicle model must not exceed 100 characters.';
  }
  if (values.vehicle_type_id && !UUID_RE.test(values.vehicle_type_id)) {
    errors.vehicle_type_id = 'Vehicle type ID must be a valid UUID.';
  }
  if (values.depot_id && !UUID_RE.test(values.depot_id)) {
    errors.depot_id = 'Depot ID must be a valid UUID.';
  }
  if (values.in_service_date) {
    const d = new Date(values.in_service_date);
    if (isNaN(d.getTime())) {
      errors.in_service_date = 'In-service date must be a valid date.';
    }
  }
  if (values.status && values.status.length > 30) {
    errors.status = 'Status must not exceed 30 characters.';
  }

  return errors;
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'neutral';
  if (status === 'decommissioned') return 'error';
  return 'neutral';
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  if (status === 'decommissioned') return 'Decommissioned';
  return status;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.substring(0, 10);
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-body)',
  marginBottom: 'var(--space-1)',
};

const baseInputStyle: React.CSSProperties = {
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
  fontFamily: 'inherit',
};

const errorInputStyle: React.CSSProperties = {
  ...baseInputStyle,
  border: '1px solid var(--color-error)',
};

const fieldErrorStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 'var(--space-1)',
  fontSize: 'var(--font-size-caption)',
  color: 'var(--color-error)',
};

const sectionLabelStyle: React.CSSProperties = {
  color: 'var(--color-muted)',
  fontSize: 'var(--font-size-caption)',
  fontWeight: 'var(--font-weight-semibold)',
  letterSpacing: 'var(--font-letter-spacing-caps)',
  textTransform: 'uppercase',
  marginBottom: 'var(--space-3)',
  marginTop: '0',
};

export default function EditVehiclePage(): React.ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    registration_number: '',
    make: '',
    model: '',
    vehicle_type_id: '',
    depot_id: '',
    status: 'active',
    in_service_date: '',
    has_telematics: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) {
      setLoadError('Vehicle record could not be loaded');
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const [vehicleData, vtRes, depotRes] = await Promise.all([
        getVehicle(id),
        listVehicleTypes({ page: 1, pageSize: 200 }),
        listDepots({ page: 1, pageSize: 200 }),
      ]);
      setVehicle(vehicleData);
      setVehicleTypes(vtRes.data);
      setDepots(depotRes.data);
      setFormValues({
        registration_number: vehicleData.registration_number ?? '',
        make: vehicleData.make ?? '',
        model: vehicleData.model ?? '',
        vehicle_type_id: vehicleData.vehicle_type_id ?? '',
        depot_id: vehicleData.depot_id ?? '',
        status: vehicleData.status ?? 'active',
        in_service_date: toInputDate(vehicleData.in_service_date),
        has_telematics: vehicleData.has_telematics ?? false,
      });
    } catch (err: unknown) {
      setLoadError('Vehicle record could not be loaded');
    } finally {
      setIsLoadingData(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validate(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError('Changes could not be saved. Please try again.');
      return;
    }

    if (!id) return;

    setIsSubmitting(true);
    try {
      const body: VehicleUpdate = {
        registration_number: formValues.registration_number || undefined,
        make: formValues.make || undefined,
        model: formValues.model || undefined,
        vehicle_type_id: formValues.vehicle_type_id || undefined,
        depot_id: formValues.depot_id || undefined,
        status: (formValues.status as 'active' | 'inactive' | 'decommissioned') || undefined,
        in_service_date: formValues.in_service_date || undefined,
        has_telematics: formValues.has_telematics,
      };

      await updateVehicle(id, body);
      navigate(`/vehicles/${id}`, {
        state: { toast: { message: 'Vehicle updated successfully.', variant: 'success' } },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setSubmitError(msg || 'Changes could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteVehicle(id);
      navigate('/vehicles', {
        state: { toast: { message: 'Vehicle removed successfully.', variant: 'success' } },
      });
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err) || 'Vehicle could not be removed. Please try again.');
      setIsDeleting(false);
    }
  }

  const vehicleLabel = vehicle
    ? `${vehicle.registration_number} · ${vehicle.make} ${vehicle.model}`
    : id ?? '';

  // --- Loading state ---
  if (isLoadingData) {
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
            color: 'var(--color-ink)',
            margin: '0 0 var(--space-2) 0',
          }}
        >
          Edit Vehicle
        </h1>

        {/* Back nav skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '20px',
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--elevation-2)',
            padding: 'var(--space-6)',
          }}
        >
          {/* Section label */}
          <div
            style={{
              width: '120px',
              height: '12px',
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
            }}
          />
          {/* Field skeletons */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '44px',
                background: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-4)',
                position: 'relative',
                overflow: 'hidden',
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
          ))}
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        </div>
      </div>
    );
  }

  // --- Load error state ---
  if (loadError) {
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
            color: 'var(--color-ink)',
            margin: '0 0 var(--space-6) 0',
          }}
        >
          Edit Vehicle
        </h1>
        <Alert variant="error" message={loadError} />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => navigate('/vehicles')}>
            ← Back to vehicles
          </Button>
        </div>
      </div>
    );
  }

  // --- Main form ---
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
        Edit Vehicle
      </h1>

      {/* Breadcrumb / back nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/vehicles/${id}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--color-muted)',
            fontSize: 'var(--font-size-small)',
            fontFamily: 'inherit',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to vehicle
        </button>
        <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-small)' }}>/</span>
        <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-small)' }}>
          {vehicleLabel}
        </span>
      </div>

      <div style={{ maxWidth: 'var(--content-narrow-width)' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* Submit error banner */}
          {submitError && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Alert variant="error" message={submitError} />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* === Section: Vehicle identity === */}
            <p style={sectionLabelStyle}>Vehicle identity</p>

            {/* Row 1: Registration + Make */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-5)',
                flexWrap: 'wrap',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label
                  htmlFor="edit-vehicle-registration_number"
                  style={fieldLabelStyle}
                >
                  Registration number{' '}
                  <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <input
                  id="edit-vehicle-registration_number"
                  name="registration_number"
                  type="text"
                  placeholder="e.g. AB12 CDE"
                  value={formValues.registration_number}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    ...(formErrors.registration_number ? errorInputStyle : baseInputStyle),
                    fontFamily: 'var(--font-family-mono)',
                    letterSpacing: 'var(--font-letter-spacing-wide)',
                  }}
                />
                {formErrors.registration_number && (
                  <span style={fieldErrorStyle}>{formErrors.registration_number}</span>
                )}
              </div>

              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-make" style={fieldLabelStyle}>
                  Make <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <input
                  id="edit-vehicle-make"
                  name="make"
                  type="text"
                  placeholder="e.g. Volvo, MAN, DAF"
                  value={formValues.make}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={formErrors.make ? errorInputStyle : baseInputStyle}
                />
                {formErrors.make && (
                  <span style={fieldErrorStyle}>{formErrors.make}</span>
                )}
              </div>
            </div>

            {/* Row 2: Model + Vehicle type */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-5)',
                flexWrap: 'wrap',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-model" style={fieldLabelStyle}>
                  Model <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <input
                  id="edit-vehicle-model"
                  name="model"
                  type="text"
                  placeholder="e.g. FH16, TGX, CF"
                  value={formValues.model}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={formErrors.model ? errorInputStyle : baseInputStyle}
                />
                {formErrors.model && (
                  <span style={fieldErrorStyle}>{formErrors.model}</span>
                )}
              </div>

              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-vehicle_type_id" style={fieldLabelStyle}>
                  Vehicle type <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <select
                  id="edit-vehicle-vehicle_type_id"
                  name="vehicle_type_id"
                  value={formValues.vehicle_type_id}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    ...(formErrors.vehicle_type_id ? errorInputStyle : baseInputStyle),
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a type…</option>
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
            </div>

            {/* Divider */}
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--color-border-subtle)',
                margin: '0 0 var(--space-6) 0',
              }}
            />

            {/* === Section: Operations === */}
            <p style={sectionLabelStyle}>Operations</p>

            {/* Row 3: Depot + Status */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-5)',
                flexWrap: 'wrap',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-depot_id" style={fieldLabelStyle}>
                  Assigned depot <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <select
                  id="edit-vehicle-depot_id"
                  name="depot_id"
                  value={formValues.depot_id}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    ...(formErrors.depot_id ? errorInputStyle : baseInputStyle),
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a depot…</option>
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

              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-status" style={fieldLabelStyle}>
                  Status <span style={{ color: 'var(--color-ink)' }}>*</span>
                </label>
                <select
                  id="edit-vehicle-status"
                  name="status"
                  value={formValues.status}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    ...(formErrors.status ? errorInputStyle : baseInputStyle),
                    cursor: 'pointer',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
                {formErrors.status && (
                  <span style={fieldErrorStyle}>{formErrors.status}</span>
                )}
              </div>
            </div>

            {/* Row 4: In-service date + Telematics */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-5)',
                flexWrap: 'wrap',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label htmlFor="edit-vehicle-in_service_date" style={fieldLabelStyle}>
                  In-service date
                </label>
                <input
                  id="edit-vehicle-in_service_date"
                  name="in_service_date"
                  type="date"
                  value={formValues.in_service_date}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={formErrors.in_service_date ? errorInputStyle : baseInputStyle}
                />
                {formErrors.in_service_date ? (
                  <span style={fieldErrorStyle}>{formErrors.in_service_date}</span>
                ) : (
                  <p
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-muted)',
                      marginTop: 'var(--space-1)',
                      marginBottom: '0',
                    }}
                  >
                    Date the vehicle entered operational service.
                  </p>
                )}
              </div>

              <div
                style={{
                  flex: '1',
                  minWidth: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                <label
                  style={{
                    ...fieldLabelStyle,
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Telematics unit fitted
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    background: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--color-border-subtle)',
                    minHeight: 'var(--touch-target-min)',
                    color: 'var(--color-on-surface-raised)',
                  }}
                >
                  <input
                    type="checkbox"
                    id="edit-vehicle-has_telematics"
                    name="has_telematics"
                    checked={formValues.has_telematics}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: 'var(--color-primary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <label
                    htmlFor="edit-vehicle-has_telematics"
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-body)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      lineHeight: 'var(--font-line-height-small)',
                    }}
                  >
                    This vehicle has a telematics unit installed
                  </label>
                </div>
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-muted)',
                    marginTop: 'var(--space-1)',
                    marginBottom: '0',
                  }}
                >
                  Enables automatic odometer readings and GPS tracking.
                </p>
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
                margin: '0 0 var(--space-6) 0',
              }}
            />

            {/* Current status summary */}
            {vehicle && (
              <div
                style={{
                  background: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-5)',
                  flexWrap: 'wrap',
                  marginBottom: 'var(--space-6)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-on-canvas)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    color: 'var(--color-on-canvas)',
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
                    Current status
                  </span>
                  <Badge variant={statusVariant(vehicle.status)}>
                    {statusLabel(vehicle.status)}
                  </Badge>
                </div>

                <div
                  style={{
                    width: '1px',
                    height: '36px',
                    background: 'var(--color-border-subtle)',
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    color: 'var(--color-on-canvas)',
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
                  <span
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-body)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {formatDateTime(vehicle.updated_at)}
                  </span>
                </div>

                <div
                  style={{
                    width: '1px',
                    height: '36px',
                    background: 'var(--color-border-subtle)',
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    color: 'var(--color-on-canvas)',
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
                    Registration
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-body)',
                      fontWeight: 'var(--font-weight-medium)',
                      fontFamily: 'var(--font-family-mono)',
                      letterSpacing: 'var(--font-letter-spacing-wide)',
                    }}
                  >
                    {vehicle.registration_number}
                  </span>
                </div>
              </div>
            )}

            {/* Form actions */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={isSubmitting || isDeleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background: 'none',
                  border: '1px solid var(--color-error-light)',
                  color: 'var(--color-error)',
                  cursor: isSubmitting || isDeleting ? 'not-allowed' : 'pointer',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  fontFamily: 'inherit',
                  minHeight: 'var(--touch-target-min)',
                  opacity: isSubmitting || isDeleting ? 0.6 : 1,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 4h12M5 4V2.667A.667.667 0 015.667 2h4.666A.667.667 0 0111 2.667V4M6.333 7.333v4M9.667 7.333v4M3.333 4l.667 9.333A.667.667 0 004.667 14h6.666a.667.667 0 00.667-.667L12.667 4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Remove vehicle
              </button>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/vehicles/${id}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteError(null);
            }
          }}
          title="Remove vehicle"
        >
          <div style={{ color: 'var(--color-on-surface)' }}>
            <p
              style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--color-body)',
                marginTop: '0',
                marginBottom: 'var(--space-4)',
              }}
            >
              Are you sure you want to remove{' '}
              <strong>
                {vehicle
                  ? `${vehicle.registration_number} — ${vehicle.make} ${vehicle.model}`
                  : 'this vehicle'}
              </strong>{' '}
              from the fleet? This action cannot be undone.
            </p>

            {deleteError && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Alert variant="error" message={deleteError} />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing…' : 'Remove vehicle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
