import React, { useState } from 'react';
import { ReadingCreate } from '../../types/reading';
import { createReading } from '../../services/readingsService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Alert from '../ui/Alert';
import { getErrorMessage } from '../../utils/errorUtils';
import { toInputDateValue } from '../../utils/dateUtils';
import { parseOdometerInput } from '../../utils/odometerUtils';

export interface OdometerReadingFormProps {
  vehicleId: string;
  onSuccess?: (readingId: string) => void;
  onCancel?: () => void;
}

interface FormState {
  odometer_km: string;
  source: 'manual' | 'telematics';
  reading_timestamp: string;
  is_test_mode: boolean;
}

interface FormErrors {
  odometer_km?: string;
  source?: string;
  reading_timestamp?: string;
  vehicle_id?: string;
  general?: string;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function getNowLocalDateTimeValue(): string {
  const now = new Date();
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    'T' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes())
  );
}

export function OdometerReadingForm({
  vehicleId,
  onSuccess,
  onCancel,
}: OdometerReadingFormProps): React.ReactElement {
  const [form, setForm] = useState<FormState>({
    odometer_km: '',
    source: 'manual',
    reading_timestamp: getNowLocalDateTimeValue(),
    is_test_mode: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!vehicleId || !UUID_REGEX.test(vehicleId)) {
      errs.vehicle_id = 'Vehicle ID must be a valid UUID.';
    }

    const odometerValue = parseOdometerInput(form.odometer_km);
    if (form.odometer_km.trim() === '' || odometerValue === null || odometerValue < 0) {
      errs.odometer_km = 'Odometer reading is required and must be a non-negative number.';
    }

    if (!form.source || (form.source !== 'manual' && form.source !== 'telematics')) {
      errs.source = "Source must be either 'manual' or 'telematics'.";
    }

    if (!form.reading_timestamp) {
      errs.reading_timestamp = 'Reading timestamp is required and must be a valid date-time value.';
    } else {
      const parsed = new Date(form.reading_timestamp);
      if (isNaN(parsed.getTime())) {
        errs.reading_timestamp = 'Reading timestamp is required and must be a valid date-time value.';
      }
    }

    return errs;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitSuccess(false);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const odometerValue = parseOdometerInput(form.odometer_km) as number;
      const timestampIso = new Date(form.reading_timestamp).toISOString();

      const body: ReadingCreate = {
        vehicle_id: vehicleId,
        odometer_km: odometerValue,
        source: form.source,
        reading_timestamp: timestampIso,
        is_test_mode: form.is_test_mode,
      };

      const result = await createReading(body);
      setSubmitSuccess(true);
      setForm({
        odometer_km: '',
        source: 'manual',
        reading_timestamp: getNowLocalDateTimeValue(),
        is_test_mode: false,
      });
      onSuccess?.(result.id);
    } catch (err) {
      setErrors({ general: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  }

  const sourceOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'telematics', label: 'Telematics' },
  ];

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-h3)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-h3)',
          }}
        >
          Submit Odometer Reading
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-muted)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          Enter the current odometer reading for this vehicle.
        </span>
      </div>

      {errors.general && (
        <Alert variant="error" onDismiss={() => setErrors((prev) => ({ ...prev, general: undefined }))}>
          {errors.general}
        </Alert>
      )}

      {submitSuccess && (
        <Alert variant="success">
          Odometer reading submitted successfully.
        </Alert>
      )}

      {errors.vehicle_id && (
        <Alert variant="error">{errors.vehicle_id}</Alert>
      )}

      {/* Odometer km */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label
          htmlFor="odometer_km"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          Odometer Reading (km) <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <Input
          id="odometer_km"
          name="odometer_km"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 123456"
          value={form.odometer_km}
          onChange={handleChange}
          aria-invalid={!!errors.odometer_km}
          aria-describedby={errors.odometer_km ? 'odometer_km-error' : undefined}
          disabled={isSubmitting}
          style={{
            borderColor: errors.odometer_km ? 'var(--color-error)' : undefined,
          }}
        />
        {errors.odometer_km && (
          <span
            id="odometer_km-error"
            role="alert"
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {errors.odometer_km}
          </span>
        )}
      </div>

      {/* Source */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label
          htmlFor="source"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          Source <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <Select
          id="source"
          name="source"
          value={form.source}
          onChange={handleChange}
          options={sourceOptions}
          aria-invalid={!!errors.source}
          aria-describedby={errors.source ? 'source-error' : undefined}
          disabled={isSubmitting}
          style={{
            borderColor: errors.source ? 'var(--color-error)' : undefined,
          }}
        />
        {errors.source && (
          <span
            id="source-error"
            role="alert"
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {errors.source}
          </span>
        )}
      </div>

      {/* Reading timestamp */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label
          htmlFor="reading_timestamp"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          Reading Date &amp; Time <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <Input
          id="reading_timestamp"
          name="reading_timestamp"
          type="datetime-local"
          value={form.reading_timestamp}
          onChange={handleChange}
          aria-invalid={!!errors.reading_timestamp}
          aria-describedby={errors.reading_timestamp ? 'reading_timestamp-error' : undefined}
          disabled={isSubmitting}
          style={{
            borderColor: errors.reading_timestamp ? 'var(--color-error)' : undefined,
          }}
        />
        {errors.reading_timestamp && (
          <span
            id="reading_timestamp-error"
            role="alert"
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {errors.reading_timestamp}
          </span>
        )}
      </div>

      {/* Test mode toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <input
          id="is_test_mode"
          name="is_test_mode"
          type="checkbox"
          checked={form.is_test_mode}
          onChange={handleChange}
          disabled={isSubmitting}
          style={{
            width: 'var(--space-5)',
            height: 'var(--space-5)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            accentColor: 'var(--color-primary)',
          }}
        />
        <label
          htmlFor="is_test_mode"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
            lineHeight: 'var(--font-line-height-small)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          Test mode reading
        </label>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Reading'}
        </Button>
      </div>
    </form>
  );
}

export default OdometerReadingForm;
