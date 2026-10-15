import React, { useEffect, useState } from 'react';
import { UserRead } from '../../types/auth';
import apiClient from '../../services/apiClient';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { getErrorMessage } from '../../utils/errorUtils';

export interface AssignTechnicianFieldProps {
  value: string;
  onChange: (technicianId: string) => void;
  depotId?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export function AssignTechnicianField({
  value,
  onChange,
  depotId,
  disabled = false,
  error,
  id = 'assigned-technician',
  name = 'assigned_technician_id',
  required = false,
}: AssignTechnicianFieldProps): React.ReactElement {
  const [technicians, setTechnicians] = useState<UserRead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTechnicians(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params: Record<string, string> = { role: 'technician' };
        if (depotId) {
          params.depot_id = depotId;
        }
        const response = await apiClient.get<{ items: UserRead[] }>('/users', { params });
        if (!cancelled) {
          setTechnicians(response.data.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchTechnicians();

    return () => {
      cancelled = true;
    };
  }, [depotId]);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    onChange(event.target.value);
  }

  const errorDescId = error ? `${id}-error` : undefined;
  const loadErrorDescId = loadError ? `${id}-load-error` : undefined;

  const options = [
    { value: '', label: 'Unassigned' },
    ...technicians.map((tech) => ({
      value: tech.id,
      label: tech.full_name,
    })),
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--font-size-small)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-body)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
        }}
      >
        Assigned Technician
        {required && (
          <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
            *
          </span>
        )}
        {isLoading && (
          <Spinner
            size="sm"
            aria-label="Loading technicians"
          />
        )}
      </label>

      {loadError ? (
        <div
          id={loadErrorDescId}
          role="alert"
          style={{
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-error)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-error-light)',
            borderRadius: 'var(--radius-sm)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          Failed to load technicians: {loadError}
        </div>
      ) : (
        <Select
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled || isLoading}
          options={options}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorDescId}
          style={{
            borderColor: error ? 'var(--color-error)' : undefined,
          }}
        />
      )}

      {error && (
        <span
          id={errorDescId}
          role="alert"
          style={{
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-error)',
            lineHeight: 'var(--font-line-height-small)',
          }}
        >
          {error}
        </span>
      )}

      <span
        style={{
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-muted)',
          lineHeight: 'var(--font-line-height-caption)',
        }}
      >
        Select the technician responsible for this work order, or leave unassigned.
      </span>
    </div>
  );
}

export default AssignTechnicianField;
