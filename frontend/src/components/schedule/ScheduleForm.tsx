import React, { useState, useEffect } from 'react';
import type { Schedule, ScheduleCreate, ScheduleUpdate } from '../../types/schedule';
import type { VehicleType } from '../../types/vehicleType';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Alert from '../ui/Alert';
import { getErrorMessage } from '../../utils/errorUtils';

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface ScheduleFormProps {
  /** When provided the form is in edit mode; fields are pre-filled and only updatable fields are shown */
  initialValues?: Schedule;
  /** List of available vehicle types for the selector (create mode only) */
  vehicleTypes?: VehicleType[];
  isLoading?: boolean;
  error?: unknown;
  onSubmit: (data: ScheduleCreate | ScheduleUpdate) => void;
  onCancel?: () => void;
}

interface FormErrors {
  vehicle_type_id?: string;
  vehicle_class?: string;
  km_interval?: string;
  month_interval?: string;
  is_active?: string;
}

const VEHICLE_CLASS_OPTIONS = [
  { value: '', label: 'Select vehicle class…' },
  { value: 'heavy_truck', label: 'Heavy Truck' },
  { value: 'light_commercial', label: 'Light Commercial' },
  { value: 'other', label: 'Other' },
];

function validateCreate(values: {
  vehicle_type_id: string;
  vehicle_class: string;
  km_interval: string;
  month_interval: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.vehicle_type_id) {
    errors.vehicle_type_id = 'Vehicle type ID must be a valid UUID.';
  } else if (!UUID_PATTERN.test(values.vehicle_type_id)) {
    errors.vehicle_type_id = 'Vehicle type ID must be a valid UUID.';
  }

  if (!values.vehicle_class || values.vehicle_class.length === 0) {
    errors.vehicle_class = 'Vehicle class is required and must not exceed 50 characters.';
  } else if (values.vehicle_class.length > 50) {
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

function validateUpdate(values: {
  km_interval: string;
  month_interval: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (values.km_interval !== '') {
    const km = parseInt(values.km_interval, 10);
    if (isNaN(km) || km < 1 || !Number.isInteger(km)) {
      errors.km_interval = 'Kilometre interval must be a positive whole number.';
    }
  }

  if (values.month_interval !== '') {
    const months = parseInt(values.month_interval, 10);
    if (isNaN(months) || months < 1 || !Number.isInteger(months)) {
      errors.month_interval = 'Month interval must be a positive whole number.';
    }
  }

  return errors;
}

export function ScheduleForm({
  initialValues,
  vehicleTypes = [],
  isLoading = false,
  error,
  onSubmit,
  onCancel,
}: ScheduleFormProps): React.ReactElement {
  const isEditMode = Boolean(initialValues);

  const [vehicleTypeId, setVehicleTypeId] = useState<string>(
    initialValues?.vehicle_type_id ?? ''
  );
  const [vehicleClass, setVehicleClass] = useState<string>(
    initialValues?.vehicle_class ?? ''
  );
  const [kmInterval, setKmInterval] = useState<string>(
    initialValues?.km_interval != null ? String(initialValues.km_interval) : ''
  );
  const [monthInterval, setMonthInterval] = useState<string>(
    initialValues?.month_interval != null ? String(initialValues.month_interval) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(initialValues?.is_active ?? true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setVehicleTypeId(initialValues.vehicle_type_id);
      setVehicleClass(initialValues.vehicle_class);
      setKmInterval(String(initialValues.km_interval));
      setMonthInterval(String(initialValues.month_interval));
      setIsActive(initialValues.is_active);
    }
  }, [initialValues]);

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isEditMode) {
      const errors = validateUpdate({ km_interval: kmInterval, month_interval: monthInterval });
      setFormErrors(errors);
      setTouched({ km_interval: true, month_interval: true, is_active: true });
      if (Object.keys(errors).length > 0) return;

      const updateData: ScheduleUpdate = {};
      if (kmInterval !== '') updateData.km_interval = parseInt(kmInterval, 10);
      if (monthInterval !== '') updateData.month_interval = parseInt(monthInterval, 10);
      updateData.is_active = isActive;

      onSubmit(updateData);
    } else {
      const errors = validateCreate({
        vehicle_type_id: vehicleTypeId,
        vehicle_class: vehicleClass,
        km_interval: kmInterval,
        month_interval: monthInterval,
      });
      setFormErrors(errors);
      setTouched({
        vehicle_type_id: true,
        vehicle_class: true,
        km_interval: true,
        month_interval: true,
        is_active: true,
      });
      if (Object.keys(errors).length > 0) return;

      const createData: ScheduleCreate = {
        vehicle_type_id: vehicleTypeId,
        vehicle_class: vehicleClass as ScheduleCreate['vehicle_class'],
        km_interval: parseInt(kmInterval, 10),
        month_interval: parseInt(monthInterval, 10),
        is_active: isActive,
      };
      onSubmit(createData);
    }
  }

  const vehicleTypeOptions = [
    { value: '', label: 'Select vehicle type…' },
    ...vehicleTypes.map((vt) => ({ value: vt.id, label: vt.name })),
  ];

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-family-base)',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)',
    lineHeight: 'var(--font-line-height-small)',
    color: 'var(--color-body)',
    marginBottom: 'var(--space-1)',
    display: 'block',
  };

  const errorTextStyle: React.CSSProperties = {
    fontFamily: 'var(--font-family-base)',
    fontSize: 'var(--font-size-caption)',
    fontWeight: 'var(--font-weight-regular)',
    lineHeight: 'var(--font-line-height-caption)',
    color: 'var(--color-error)',
    marginTop: 'var(--space-1)',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    minHeight: 'var(--touch-target-min)',
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      {Boolean(error) && (
        <Alert variant="error" message={getErrorMessage(error)} />
      )}

      {!isEditMode && (
        <>
          {/* Vehicle Type selector */}
          <div style={fieldStyle}>
            <label htmlFor="schedule-vehicle-type" style={labelStyle}>
              Vehicle Type <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <Select
              id="schedule-vehicle-type"
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              onBlur={() => handleBlur('vehicle_type_id')}
              options={vehicleTypeOptions}
              aria-invalid={touched.vehicle_type_id && Boolean(formErrors.vehicle_type_id)}
              aria-describedby={formErrors.vehicle_type_id ? 'error-vehicle-type-id' : undefined}
              disabled={isLoading}
            />
            {touched.vehicle_type_id && formErrors.vehicle_type_id && (
              <span id="error-vehicle-type-id" style={errorTextStyle} role="alert">
                {formErrors.vehicle_type_id}
              </span>
            )}
          </div>

          {/* Vehicle Class selector */}
          <div style={fieldStyle}>
            <label htmlFor="schedule-vehicle-class" style={labelStyle}>
              Vehicle Class <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <Select
              id="schedule-vehicle-class"
              value={vehicleClass}
              onChange={(e) => setVehicleClass(e.target.value)}
              onBlur={() => handleBlur('vehicle_class')}
              options={VEHICLE_CLASS_OPTIONS}
              aria-invalid={touched.vehicle_class && Boolean(formErrors.vehicle_class)}
              aria-describedby={formErrors.vehicle_class ? 'error-vehicle-class' : undefined}
              disabled={isLoading}
            />
            {touched.vehicle_class && formErrors.vehicle_class && (
              <span id="error-vehicle-class" style={errorTextStyle} role="alert">
                {formErrors.vehicle_class}
              </span>
            )}
          </div>
        </>
      )}

      {/* KM Interval */}
      <div style={fieldStyle}>
        <label htmlFor="schedule-km-interval" style={labelStyle}>
          Kilometre Interval (km){!isEditMode && <span style={{ color: 'var(--color-error)' }}> *</span>}
        </label>
        <Input
          id="schedule-km-interval"
          type="number"
          min={1}
          step={1}
          placeholder="e.g. 12000"
          value={kmInterval}
          onChange={(e) => setKmInterval(e.target.value)}
          onBlur={() => handleBlur('km_interval')}
          aria-invalid={touched.km_interval && Boolean(formErrors.km_interval)}
          aria-describedby={formErrors.km_interval ? 'error-km-interval' : undefined}
          disabled={isLoading}
        />
        {touched.km_interval && formErrors.km_interval && (
          <span id="error-km-interval" style={errorTextStyle} role="alert">
            {formErrors.km_interval}
          </span>
        )}
      </div>

      {/* Month Interval */}
      <div style={fieldStyle}>
        <label htmlFor="schedule-month-interval" style={labelStyle}>
          Month Interval{!isEditMode && <span style={{ color: 'var(--color-error)' }}> *</span>}
        </label>
        <Input
          id="schedule-month-interval"
          type="number"
          min={1}
          step={1}
          placeholder="e.g. 6"
          value={monthInterval}
          onChange={(e) => setMonthInterval(e.target.value)}
          onBlur={() => handleBlur('month_interval')}
          aria-invalid={touched.month_interval && Boolean(formErrors.month_interval)}
          aria-describedby={formErrors.month_interval ? 'error-month-interval' : undefined}
          disabled={isLoading}
        />
        {touched.month_interval && formErrors.month_interval && (
          <span id="error-month-interval" style={errorTextStyle} role="alert">
            {formErrors.month_interval}
          </span>
        )}
      </div>

      {/* Active toggle */}
      <div style={fieldStyle}>
        <div style={checkboxRowStyle}>
          <input
            id="schedule-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isLoading}
            style={{
              width: 'var(--space-4)',
              height: 'var(--space-4)',
              accentColor: 'var(--color-primary)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          />
          <label
            htmlFor="schedule-is-active"
            style={{
              ...labelStyle,
              marginBottom: 0,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Active schedule
          </label>
        </div>
        {touched.is_active && formErrors.is_active && (
          <span id="error-is-active" style={errorTextStyle} role="alert">
            {formErrors.is_active}
          </span>
        )}
      </div>

      {/* Summary hint */}
      {kmInterval && monthInterval && !formErrors.km_interval && !formErrors.month_interval && (
        <p
          style={{
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-regular)',
            lineHeight: 'var(--font-line-height-small)',
            color: 'var(--color-muted)',
            margin: 0,
            padding: 'var(--space-3)',
            backgroundColor: 'var(--color-canvas)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--color-primary-light)',
          }}
        >
          Service will be due at{' '}
          <strong>{parseInt(kmInterval, 10).toLocaleString()} km</strong> or{' '}
          <strong>
            {parseInt(monthInterval, 10)}{' '}
            {parseInt(monthInterval, 10) === 1 ? 'month' : 'months'}
          </strong>
          , whichever comes first.
        </p>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isEditMode ? 'Save Changes' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  );
}

export default ScheduleForm;
