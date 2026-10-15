import React, { useState } from 'react';
import { WorkOrder, WorkOrderClose } from '../../types/workOrder';
import { closeWorkOrder } from '../../services/workOrdersService';
import { getErrorMessage } from '../../utils/errorUtils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Alert from '../ui/Alert';

export interface CloseWorkOrderFormProps {
  workOrder: WorkOrder;
  onSuccess: (updated: WorkOrder) => void;
  onCancel?: () => void;
}

export function CloseWorkOrderForm({
  workOrder,
  onSuccess,
  onCancel,
}: CloseWorkOrderFormProps): React.ReactElement {
  const [completionNotes, setCompletionNotes] = useState('');
  const [postServiceOdometerKm, setPostServiceOdometerKm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!completionNotes.trim()) {
      nextErrors.completion_notes = 'Completion notes are required to close a work order.';
    }

    const odometerValue = postServiceOdometerKm.trim();
    if (!odometerValue) {
      nextErrors.post_service_odometer_km =
        'Post-service odometer reading is required and must be a non-negative number.';
    } else {
      const parsed = Number(odometerValue);
      if (isNaN(parsed) || parsed < 0) {
        nextErrors.post_service_odometer_km =
          'Post-service odometer reading is required and must be a non-negative number.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    const body: WorkOrderClose = {
      completion_notes: completionNotes.trim(),
      post_service_odometer_km: Number(postServiceOdometerKm.trim()),
    };

    setIsSubmitting(true);
    try {
      const updated = await closeWorkOrder(workOrder.id, body);
      onSuccess(updated);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNotesChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setCompletionNotes(event.target.value);
    if (errors.completion_notes) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.completion_notes;
        return next;
      });
    }
  }

  function handleOdometerChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setPostServiceOdometerKm(event.target.value);
    if (errors.post_service_odometer_km) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.post_service_odometer_km;
        return next;
      });
    }
  }

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
      {/* Work order reference */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-raised)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-muted)',
          }}
        >
          Closing work order:
        </span>
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-body)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          WO #{workOrder.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Submit error */}
      {submitError && (
        <Alert variant="error" title="Failed to close work order">
          {submitError}
        </Alert>
      )}

      {/* Completion notes */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        <label
          htmlFor="completion-notes"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
          }}
        >
          Completion Notes{' '}
          <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
            *
          </span>
        </label>
        <Textarea
          id="completion-notes"
          name="completion_notes"
          value={completionNotes}
          onChange={handleNotesChange}
          placeholder="Describe the work completed…"
          rows={4}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.completion_notes}
          aria-describedby={errors.completion_notes ? 'completion-notes-error' : undefined}
          style={{
            borderColor: errors.completion_notes
              ? 'var(--color-error)'
              : undefined,
          }}
        />
        {errors.completion_notes && (
          <span
            id="completion-notes-error"
            role="alert"
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {errors.completion_notes}
          </span>
        )}
      </div>

      {/* Post-service odometer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        <label
          htmlFor="post-service-odometer"
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-body)',
          }}
        >
          Post-Service Odometer (km){' '}
          <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
            *
          </span>
        </label>
        <Input
          id="post-service-odometer"
          name="post_service_odometer_km"
          type="number"
          min={0}
          step={1}
          value={postServiceOdometerKm}
          onChange={handleOdometerChange}
          placeholder="e.g. 125000"
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.post_service_odometer_km}
          aria-describedby={
            errors.post_service_odometer_km ? 'post-service-odometer-error' : undefined
          }
          style={{
            borderColor: errors.post_service_odometer_km
              ? 'var(--color-error)'
              : undefined,
          }}
        />
        {errors.post_service_odometer_km && (
          <span
            id="post-service-odometer-error"
            role="alert"
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-error)',
              lineHeight: 'var(--font-line-height-small)',
            }}
          >
            {errors.post_service_odometer_km}
          </span>
        )}
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-muted)',
            lineHeight: 'var(--font-line-height-caption)',
          }}
        >
          Enter the current odometer reading at time of service completion.
        </span>
      </div>

      {/* Form actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-2)',
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
          Close Work Order
        </Button>
      </div>
    </form>
  );
}

export default CloseWorkOrderForm;
