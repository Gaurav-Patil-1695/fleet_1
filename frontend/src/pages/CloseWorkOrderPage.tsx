import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWorkOrder, closeWorkOrder } from '../services/workOrdersService';
import type { WorkOrder, WorkOrderClose } from '../types/workOrder';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import WorkOrderStatusBadge from '../components/workOrder/WorkOrderStatusBadge';

interface FormValues {
  completion_notes: string;
  post_service_odometer_km: string;
}

interface FormErrors {
  completion_notes?: string;
  post_service_odometer_km?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.completion_notes.trim()) {
    errors.completion_notes = 'Completion notes are required to close a work order.';
  }

  const odometerVal = values.post_service_odometer_km.trim();
  if (!odometerVal) {
    errors.post_service_odometer_km =
      'Post-service odometer reading is required and must be a non-negative number.';
  } else {
    const parsed = parseFloat(odometerVal);
    if (isNaN(parsed) || parsed < 0) {
      errors.post_service_odometer_km =
        'Post-service odometer reading is required and must be a non-negative number.';
    }
  }

  return errors;
}

function SkeletonBlock({ width, height }: { width?: string; height?: string }): React.ReactElement {
  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '20px',
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius-xs)',
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

export default function CloseWorkOrderPage(): React.ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alreadyClosed, setAlreadyClosed] = useState(false);

  const [formValues, setFormValues] = useState<FormValues>({
    completion_notes: '',
    post_service_odometer_km: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkOrder = useCallback(async () => {
    if (!id) {
      setLoadError('Work order could not be loaded');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setAlreadyClosed(false);
    try {
      const wo = await getWorkOrder(id);
      setWorkOrder(wo);
      if (wo.status === 'closed' || wo.status === 'cancelled') {
        setAlreadyClosed(true);
      }
    } catch (err: unknown) {
      setLoadError('Work order could not be loaded');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkOrder();
  }, [loadWorkOrder]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
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
      const body: WorkOrderClose = {
        completion_notes: formValues.completion_notes.trim(),
        post_service_odometer_km: parseFloat(formValues.post_service_odometer_km),
      };
      await closeWorkOrder(id, body);
      navigate(`/work-orders/${id}`, {
        state: { toast: { message: 'Work order closed. Service clock reset.', variant: 'success' } },
      });
    } catch (err: unknown) {
      setSubmitError('Work order could not be closed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-body)',
    marginBottom: 'var(--space-2)',
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-body)',
    lineHeight: 'var(--font-line-height-body)',
    color: 'var(--color-body)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    minHeight: 'var(--touch-target-min)',
    outline: 'none',
    fontFamily: 'var(--font-family-base)',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid var(--color-error)',
  };

  const fieldErrorStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    marginTop: 'var(--space-1)',
    fontSize: 'var(--font-size-caption)',
    color: 'var(--color-error)',
  };

  const captionStyle: React.CSSProperties = {
    color: 'var(--color-muted)',
    fontSize: 'var(--font-size-caption)',
    margin: 'var(--space-1) 0 0 0',
  };

  const metaLabelStyle: React.CSSProperties = {
    color: 'var(--color-muted)',
    fontSize: 'var(--font-size-caption)',
    margin: '0 0 var(--space-1) 0',
    fontWeight: 'var(--font-weight-semibold)',
    textTransform: 'uppercase' as const,
    letterSpacing: 'var(--font-letter-spacing-caps)',
  };

  const metaValueStyle: React.CSSProperties = {
    color: 'var(--color-body)',
    fontSize: 'var(--font-size-body)',
    margin: '0',
  };

  return (
    <div
      style={{
        maxWidth: 'var(--content-narrow-width)',
        margin: '0 auto',
        padding: 'var(--space-6) var(--space-4)',
        color: 'var(--color-on-canvas)',
      }}
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'center',
            flexWrap: 'wrap' as const,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/work-orders')}
            style={{
              background: 'none',
              border: 'none',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-base)',
            }}
          >
            Work Orders
          </button>
          <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-small)' }}>/</span>
          {id && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/work-orders/${id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family-base)',
                }}
              >
                {workOrder ? `WO-${workOrder.id.slice(0, 8).toUpperCase()}` : 'Work Order'}
              </button>
              <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-small)' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-small)' }}>
            Close Work Order
          </span>
        </div>
      </nav>

      {/* Page heading */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        {isLoading ? (
          <>
            <SkeletonBlock height="32px" width="60%" />
            <div style={{ marginTop: 'var(--space-2)' }}>
              <SkeletonBlock height="16px" width="40%" />
            </div>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: 'var(--font-size-h1)',
                fontWeight: 'var(--font-weight-h1)',
                lineHeight: 'var(--font-line-height-h1)',
                color: 'var(--color-body)',
                margin: '0 0 var(--space-1) 0',
              }}
            >
              Close Work Order{workOrder ? ` #WO-${workOrder.id.slice(0, 8).toUpperCase()}` : ''}
            </h1>
            <p
              style={{
                color: 'var(--color-muted)',
                fontSize: 'var(--font-size-small)',
                margin: '0',
              }}
            >
              Finalise service, record completion notes and post-service odometer reading.
            </p>
          </>
        )}
      </div>

      {/* Load error state */}
      {!isLoading && loadError && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Alert variant="error" message="Work order could not be loaded" />
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => navigate('/work-orders')}>
              &larr; Back to Work Orders
            </Button>
          </div>
        </div>
      )}

      {/* Already closed/cancelled banner */}
      {!isLoading && !loadError && alreadyClosed && workOrder && (
        <>
          <div
            style={{
              background: 'var(--color-warning-light)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'flex-start',
              marginBottom: 'var(--space-6)',
              color: 'var(--color-ink)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--color-warning)"
              strokeWidth="2"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <div>
              <p
                style={{
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: '0 0 var(--space-1) 0',
                  color: 'var(--color-ink)',
                }}
              >
                This work order is already closed and cannot be modified.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/work-orders/${id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-family-base)',
                }}
              >
                View work order &rarr;
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content: vehicle context + form */}
      {!isLoading && !loadError && !alreadyClosed && workOrder && (
        <form onSubmit={handleSubmit} noValidate>
          {/* Submit error banner */}
          {submitError && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Alert variant="error" message={submitError} />
            </div>
          )}

          {/* Vehicle context card */}
          <div
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--elevation-1)',
              marginBottom: 'var(--space-5)',
              color: 'var(--color-on-surface-raised)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  color: 'var(--color-muted)',
                  letterSpacing: 'var(--font-letter-spacing-caps)',
                  fontSize: 'var(--font-size-caption)',
                  textTransform: 'uppercase' as const,
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Vehicle &amp; Work Order Context
              </span>
              <WorkOrderStatusBadge status={workOrder.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <p style={metaLabelStyle}>Registration</p>
                <p
                  style={{
                    ...metaValueStyle,
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {/* vehicle_id is a uuid; registration not on WorkOrder, display id short */}
                  WO-{workOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div>
                <p style={metaLabelStyle}>Status</p>
                <p style={metaValueStyle}>
                  <WorkOrderStatusBadge status={workOrder.status} />
                </p>
              </div>
              <div>
                <p style={metaLabelStyle}>Raised at</p>
                <p style={metaValueStyle}>
                  {new Date(workOrder.raised_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {workOrder.post_service_odometer_km != null && (
                <div>
                  <p style={metaLabelStyle}>Pre-service odometer</p>
                  <p
                    style={{
                      ...metaValueStyle,
                      fontFamily: 'var(--font-family-mono)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    {workOrder.post_service_odometer_km.toLocaleString()} km
                  </p>
                </div>
              )}
            </div>

            {workOrder.description && (
              <div
                style={{
                  borderTop: '1px solid var(--color-border-subtle)',
                  paddingTop: 'var(--space-4)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <p style={metaLabelStyle}>Work order description</p>
                <p
                  style={{
                    color: 'var(--color-body)',
                    fontSize: 'var(--font-size-body)',
                    margin: '0',
                    lineHeight: 'var(--font-line-height-body)',
                  }}
                >
                  {workOrder.description}
                </p>
              </div>
            )}
          </div>

          {/* Closure form card */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--elevation-1)',
              marginBottom: 'var(--space-5)',
              color: 'var(--color-on-surface)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-h3)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-body)',
                margin: '0 0 var(--space-5) 0',
                paddingBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}
            >
              Service completion details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Completion notes */}
              <div>
                <label
                  htmlFor="close-work-order-completion_notes"
                  style={fieldLabelStyle}
                >
                  Completion notes
                  <span
                    style={{ color: 'var(--color-error)', marginLeft: 'var(--space-1)' }}
                    aria-hidden="true"
                  >
                    *
                  </span>
                </label>
                <textarea
                  id="close-work-order-completion_notes"
                  name="completion_notes"
                  rows={5}
                  placeholder="Describe the work completed, parts replaced, any issues found or deferred, and recommendations for the next service\u2026"
                  value={formValues.completion_notes}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    ...(formErrors.completion_notes ? inputErrorStyle : inputStyle),
                    resize: 'vertical' as const,
                    minHeight: '120px',
                  }}
                />
                {formErrors.completion_notes && (
                  <div style={fieldErrorStyle}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {formErrors.completion_notes}
                  </div>
                )}
                <p style={captionStyle}>
                  Required. These notes are recorded against the work order and appear on the
                  vehicle's service history.
                </p>
              </div>

              {/* Post-service odometer */}
              <div>
                <label
                  htmlFor="close-work-order-post_service_odometer_km"
                  style={fieldLabelStyle}
                >
                  Post-service odometer (km)
                  <span
                    style={{ color: 'var(--color-error)', marginLeft: 'var(--space-1)' }}
                    aria-hidden="true"
                  >
                    *
                  </span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap' as const,
                  }}
                >
                  <div style={{ flex: '0 0 auto', minWidth: '160px', maxWidth: '260px' }}>
                    <input
                      id="close-work-order-post_service_odometer_km"
                      name="post_service_odometer_km"
                      type="number"
                      placeholder="e.g. 148420"
                      min="0"
                      step="1"
                      value={formValues.post_service_odometer_km}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      style={{
                        ...(formErrors.post_service_odometer_km ? inputErrorStyle : inputStyle),
                        fontFamily: 'var(--font-family-mono)',
                        width: '100%',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      paddingTop: 'var(--space-2)',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="var(--color-info)"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-caption)' }}>
                      Must be a non-negative number
                    </span>
                  </div>
                </div>
                {formErrors.post_service_odometer_km && (
                  <div style={fieldErrorStyle}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {formErrors.post_service_odometer_km}
                  </div>
                )}
                <p style={captionStyle}>
                  Required. This resets the vehicle\u2019s service clock and schedules the next service
                  interval.
                </p>
              </div>

              {/* Service clock info callout */}
              <div
                style={{
                  background: 'var(--color-info-light)',
                  border: '1px solid var(--color-info)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  color: 'var(--color-ink)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="var(--color-on-info)"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p
                    style={{
                      color: 'var(--color-on-info)',
                      fontSize: 'var(--font-size-small)',
                      fontWeight: 'var(--font-weight-semibold)',
                      margin: '0 0 var(--space-1) 0',
                    }}
                  >
                    Closing this work order will reset the service clock
                  </p>
                  <p
                    style={{
                      color: 'var(--color-on-info)',
                      fontSize: 'var(--font-size-small)',
                      margin: '0',
                      lineHeight: 'var(--font-line-height-small)',
                    }}
                  >
                    The vehicle\u2019s{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>last serviced date</strong> and{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>last serviced odometer</strong>{' '}
                    will be updated to today\u2019s values. The next service due date and odometer target
                    will be automatically recalculated based on the vehicle\u2019s service schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
              paddingTop: 'var(--space-2)',
              flexWrap: 'wrap' as const,
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/work-orders/${id}`)}
              disabled={isSubmitting}
              style={{ minWidth: '120px' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              style={{
                minWidth: '180px',
                background: 'var(--color-secondary-dark)',
                color: 'var(--color-on-secondary-dark)',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--color-on-secondary-dark)',
                }}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isSubmitting ? 'Closing\u2026' : 'Close Work Order'}
              </span>
            </Button>
          </div>

          {/* Required fields note */}
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: 'var(--font-size-caption)',
              textAlign: 'right' as const,
              marginTop: 'var(--space-2)',
            }}
          >
            <span style={{ color: 'var(--color-error)' }}>*</span> Required fields
          </p>
        </form>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Context card skeleton */}
          <div
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <SkeletonBlock height="14px" width="30%" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 'var(--space-4)',
                marginTop: 'var(--space-4)',
              }}
            >
              <SkeletonBlock height="40px" />
              <SkeletonBlock height="40px" />
              <SkeletonBlock height="40px" />
              <SkeletonBlock height="40px" />
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <SkeletonBlock height="60px" />
            </div>
          </div>

          {/* Form card skeleton */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <SkeletonBlock height="24px" width="40%" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                marginTop: 'var(--space-5)',
              }}
            >
              <SkeletonBlock height="120px" />
              <SkeletonBlock height="44px" width="260px" />
              <SkeletonBlock height="80px" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
