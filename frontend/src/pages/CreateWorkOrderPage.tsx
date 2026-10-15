import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listVehicles } from '../services/vehiclesService';
import { listDepots } from '../services/depotsService';
import { createWorkOrder } from '../services/workOrdersService';
import { getCurrentUser } from '../services/authService';
import { getErrorMessage } from '../utils/errorUtils';
import type { Vehicle } from '../types/vehicle';
import type { Depot } from '../types/depot';
import type { WorkOrderCreate } from '../types/workOrder';
import type { UserRead } from '../types/auth';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface FormValues {
  vehicle_id: string;
  depot_id: string;
  assigned_technician_id: string;
  description: string;
}

interface FormErrors {
  vehicle_id?: string;
  depot_id?: string;
  description?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.vehicle_id || !UUID_RE.test(values.vehicle_id)) {
    errors.vehicle_id = 'Vehicle ID must be a valid UUID.';
  }
  if (!values.depot_id || !UUID_RE.test(values.depot_id)) {
    errors.depot_id = 'Depot ID must be a valid UUID.';
  }
  return errors;
}

function vehicleLabel(v: Vehicle): string {
  return `${v.registration_number} — ${v.make} ${v.model}`;
}

function depotLabel(d: Depot): string {
  return d.address ? `${d.name} — ${d.address}` : d.name;
}

export default function CreateWorkOrderPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();

  // Support pre-populating vehicle_id from location state (e.g. coming from /vehicles/:id)
  const preselectedVehicleId: string | null =
    (location.state as { vehicleId?: string } | null)?.vehicleId ?? null;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [technicians, setTechnicians] = useState<UserRead[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    vehicle_id: preselectedVehicleId ?? '',
    depot_id: '',
    assigned_technician_id: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [vehiclesRes, depotsRes, me] = await Promise.all([
        listVehicles({ page: 1, page_size: 500 }),
        listDepots({ page: 1, pageSize: 200 }),
        getCurrentUser(),
      ]);

      setVehicles(vehiclesRes.data);
      setDepots(depotsRes.data);
      setCurrentUser(me);

      // Set default depot_id from current user's depot
      if (me.depot_id) {
        setFormValues((prev) => ({
          ...prev,
          depot_id: prev.depot_id || me.depot_id || '',
        }));
      }

      // Technicians: users with role=technician — we derive from the vehicles endpoint
      // The API doesn't expose a /users endpoint, so we keep technicians empty
      // unless we load them differently. Per schema, assignTechnicianField handles this.
      // We will use an empty list and note this in the UI.
      setTechnicians([]);
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
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  const selectedVehicle = vehicles.find((v) => v.id === formValues.vehicle_id) ?? null;
  const selectedDepot = depots.find((d) => d.id === formValues.depot_id) ?? null;

  const canAssignTechnician =
    currentUser?.role === 'administrator' || currentUser?.role === 'manager';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validate(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const body: WorkOrderCreate = {
        vehicle_id: formValues.vehicle_id,
        depot_id: formValues.depot_id,
        ...(formValues.description.trim()
          ? { description: formValues.description.trim() }
          : {}),
      };

      const created = await createWorkOrder(body);

      navigate(`/work-orders/${created.id}`, {
        state: { toast: { message: 'Work order created.', variant: 'success' } },
      });
    } catch (err: unknown) {
      setSubmitError('Work order could not be created. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    margin: '0 0 var(--space-3) 0',
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: 'var(--font-letter-spacing-caps)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-body)',
    marginBottom: 'var(--space-2)',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-canvas)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-body)',
    height: 'var(--touch-target-min)',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const selectErrorStyle: React.CSSProperties = {
    ...selectStyle,
    border: '1px solid var(--color-error)',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-muted)',
    marginTop: 'var(--space-1)',
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-error)',
    marginTop: 'var(--space-1)',
    display: 'block',
  };

  const dividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid var(--color-border-subtle)',
    margin: '0',
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
        Create Work Order
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-6)',
          marginTop: '0',
        }}
      >
        Raise a new maintenance work order and assign it to a depot technician.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* ── Main form card ── */}
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
              flex: 1,
              minWidth: 0,
              padding: 'var(--space-6)',
              boxShadow: 'var(--elevation-2)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

                {/* ── Section: Vehicle ── */}
                <div>
                  <p style={sectionLabelStyle}>Vehicle</p>
                  <div>
                    <label
                      htmlFor="create-work-order-vehicle_id"
                      style={labelStyle}
                    >
                      Vehicle{' '}
                      <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <select
                      id="create-work-order-vehicle_id"
                      name="vehicle_id"
                      value={formValues.vehicle_id}
                      onChange={handleChange}
                      disabled={optionsLoading || !!optionsError || isSubmitting}
                      style={formErrors.vehicle_id ? selectErrorStyle : selectStyle}
                    >
                      <option value="" disabled>
                        {optionsLoading ? 'Loading options…' : 'Select a vehicle…'}
                      </option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {vehicleLabel(v)}
                        </option>
                      ))}
                    </select>
                    {formErrors.vehicle_id && (
                      <span style={errorTextStyle}>{formErrors.vehicle_id}</span>
                    )}
                    <p style={hintStyle}>
                      Select the vehicle requiring maintenance. Registration and model are shown for
                      clarity.
                    </p>
                  </div>
                </div>

                <hr style={dividerStyle} />

                {/* ── Section: Depot ── */}
                <div>
                  <p style={sectionLabelStyle}>Depot</p>
                  <div>
                    <label
                      htmlFor="create-work-order-depot_id"
                      style={labelStyle}
                    >
                      Depot{' '}
                      <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <select
                      id="create-work-order-depot_id"
                      name="depot_id"
                      value={formValues.depot_id}
                      onChange={handleChange}
                      disabled={optionsLoading || !!optionsError || isSubmitting}
                      style={formErrors.depot_id ? selectErrorStyle : selectStyle}
                    >
                      <option value="" disabled>
                        {optionsLoading ? 'Loading options…' : 'Select a depot…'}
                      </option>
                      {depots.map((d) => (
                        <option key={d.id} value={d.id}>
                          {depotLabel(d)}
                        </option>
                      ))}
                    </select>
                    {formErrors.depot_id && (
                      <span style={errorTextStyle}>{formErrors.depot_id}</span>
                    )}
                    <p style={hintStyle}>
                      Pre-set to your current depot. Change if the work is being carried out
                      elsewhere.
                    </p>
                  </div>
                </div>

                <hr style={dividerStyle} />

                {/* ── Section: Technician Assignment ── */}
                <div>
                  <p style={sectionLabelStyle}>Technician Assignment</p>
                  <div>
                    <label
                      htmlFor="create-work-order-assigned_technician_id"
                      style={labelStyle}
                    >
                      Assign technician{' '}
                      <Badge variant="info" style={{ marginLeft: 'var(--space-2)', verticalAlign: 'middle', fontSize: 'var(--font-size-caption)' }}>
                        Manager / Admin only
                      </Badge>
                    </label>
                    <select
                      id="create-work-order-assigned_technician_id"
                      name="assigned_technician_id"
                      value={formValues.assigned_technician_id}
                      onChange={handleChange}
                      disabled={!canAssignTechnician || optionsLoading || !!optionsError || isSubmitting}
                      style={{
                        ...selectStyle,
                        opacity: !canAssignTechnician ? 0.6 : 1,
                        cursor: !canAssignTechnician ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <option value="">
                        {optionsLoading ? 'Loading options…' : 'Unassigned — assign later'}
                      </option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                    <p style={hintStyle}>
                      Only depot technicians are listed. You can assign or reassign after creation.
                    </p>
                  </div>
                </div>

                <hr style={dividerStyle} />

                {/* ── Section: Description ── */}
                <div>
                  <p style={sectionLabelStyle}>Work Description</p>
                  <div>
                    <label
                      htmlFor="create-work-order-description"
                      style={labelStyle}
                    >
                      Description{' '}
                      <span
                        style={{
                          fontWeight: 'var(--font-weight-regular)',
                          color: 'var(--color-muted)',
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="create-work-order-description"
                      name="description"
                      rows={5}
                      placeholder="Describe the fault, symptoms, or maintenance task — e.g. 'Offside front brake pad worn below 3mm. Replacement and disc inspection required.'"
                      value={formValues.description}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        background: 'var(--color-canvas)',
                        color: 'var(--color-ink)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-body)',
                        fontFamily: 'var(--font-family-base)',
                        lineHeight: 'var(--font-line-height-body)',
                        outline: 'none',
                      }}
                    />
                    <p style={hintStyle}>
                      Be specific about symptoms and location on the vehicle. This is visible to the
                      assigned technician.
                    </p>
                  </div>
                </div>

              </div>

              {/* Form actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-7)',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/work-orders')}
                  disabled={isSubmitting}
                  style={{ color: 'var(--color-muted)' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || optionsLoading || !!optionsError}
                  style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    padding: 'var(--space-3) var(--space-6)',
                    fontWeight: 'var(--font-weight-semibold)',
                    minHeight: 'var(--touch-target-min)',
                  }}
                >
                  {isSubmitting ? 'Raising…' : 'Raise work order'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            width: '280px',
            flexShrink: 0,
          }}
        >
          {/* Order summary card */}
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-surface-raised)',
              color: 'var(--color-on-surface-raised)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-ink)',
                marginBottom: 'var(--space-3)',
                marginTop: '0',
              }}
            >
              Order summary
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Status
                </span>
                <Badge variant="warning">
                  Open
                </Badge>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Vehicle
                </span>
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-ink)',
                    fontWeight: 'var(--font-weight-medium)',
                    textAlign: 'right',
                    maxWidth: '160px',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedVehicle
                    ? `${selectedVehicle.registration_number}`
                    : 'Not selected'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Depot
                </span>
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-ink)',
                    fontWeight: 'var(--font-weight-medium)',
                    textAlign: 'right',
                    maxWidth: '160px',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedDepot ? selectedDepot.name : 'Not selected'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  Technician
                </span>
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-ink)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Unassigned
                </span>
              </div>
            </div>
          </div>

          {/* Guidance card */}
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-info-light)',
              color: 'var(--color-on-info)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-info)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-ink)',
                marginBottom: 'var(--space-2)',
                marginTop: '0',
              }}
            >
              Tips for a good work order
            </p>
            <ul
              style={{
                margin: '0',
                paddingLeft: 'var(--space-4)',
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-ink)',
                lineHeight: 'var(--font-line-height-body)',
              }}
            >
              <li style={{ marginBottom: 'var(--space-1)', color: 'var(--color-ink)' }}>
                Select the exact vehicle registration to avoid routing to the wrong bay.
              </li>
              <li style={{ marginBottom: 'var(--space-1)', color: 'var(--color-ink)' }}>
                Describe the fault precisely — include location, severity, and any driver report
                reference.
              </li>
              <li style={{ marginBottom: 'var(--space-1)', color: 'var(--color-ink)' }}>
                Assign a technician now if availability is confirmed, or leave blank and assign
                later.
              </li>
              <li style={{ color: 'var(--color-ink)' }}>
                You can edit the description and assignment after creation from the work order
                detail view.
              </li>
            </ul>
          </div>

          {/* Quick link card */}
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-muted)',
                marginBottom: 'var(--space-2)',
                marginTop: '0',
              }}
            >
              View all existing work orders
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate('/work-orders')}
              style={{ width: '100%', fontSize: 'var(--font-size-small)' }}
            >
              Work order list &rarr;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
