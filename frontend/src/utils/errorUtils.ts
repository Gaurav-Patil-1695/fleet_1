/**
 * errorUtils.ts
 * API error parsing and user-facing message extraction.
 */

import type { ApiError } from '../types/common';

/**
 * Attempt to parse an unknown thrown value into an ApiError shape.
 * Handles axios-style error objects, fetch Response errors, and plain Error instances.
 */
export function parseApiError(error: unknown): ApiError {
  // If it's already shaped like our ApiError
  if (isApiError(error)) {
    return error;
  }

  // Axios-style: error.response.data has { code, message, details }
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: unknown }).response;
    if (
      response != null &&
      typeof response === 'object' &&
      'data' in response
    ) {
      const data = (response as { data?: unknown }).data;
      if (isApiError(data)) {
        return data;
      }
      // data may have a detail field (FastAPI default)
      if (
        data != null &&
        typeof data === 'object' &&
        'detail' in data
      ) {
        const detail = (data as { detail?: unknown }).detail;
        return {
          code: 'ERROR',
          message: typeof detail === 'string' ? detail : 'An unexpected error occurred.',
        };
      }
    }
  }

  // Plain Error instance
  if (error instanceof Error) {
    return {
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected error occurred.',
    };
  }

  // String thrown
  if (typeof error === 'string') {
    return {
      code: 'CLIENT_ERROR',
      message: error,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
  };
}

/**
 * Type guard: returns true if the value conforms to ApiError { code, message, details? }.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    value != null &&
    typeof value === 'object' &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}

/**
 * Extract a user-facing error message string from any thrown error.
 * Falls back to a generic message if nothing useful can be extracted.
 */
export function getErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  return parsed.message || 'An unexpected error occurred.';
}

/**
 * Extract the error code from any thrown error.
 * Returns 'UNKNOWN_ERROR' if no code can be determined.
 */
export function getErrorCode(error: unknown): string {
  const parsed = parseApiError(error);
  return parsed.code || 'UNKNOWN_ERROR';
}

/**
 * Format error details (if present) into a readable list of strings.
 * Returns an empty array if there are no details.
 */
export function getErrorDetails(error: unknown): string[] {
  const parsed = parseApiError(error);
  if (!parsed.details) return [];
  if (Array.isArray(parsed.details)) {
    return parsed.details.map((d) => (typeof d === 'string' ? d : JSON.stringify(d)));
  }
  if (typeof parsed.details === 'string') {
    return [parsed.details];
  }
  return [JSON.stringify(parsed.details)];
}

/**
 * Returns true if the error represents an HTTP 401 Unauthorized response.
 * Checks both the error code and the HTTP status code if available.
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status === 401) return true;
  }
  const parsed = parseApiError(error);
  return parsed.code === 'UNAUTHORIZED' || parsed.code === '401';
}

/**
 * Returns true if the error represents an HTTP 403 Forbidden response.
 */
export function isForbiddenError(error: unknown): boolean {
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status === 403) return true;
  }
  const parsed = parseApiError(error);
  return parsed.code === 'FORBIDDEN' || parsed.code === '403';
}

/**
 * Returns true if the error represents an HTTP 404 Not Found response.
 */
export function isNotFoundError(error: unknown): boolean {
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status === 404) return true;
  }
  const parsed = parseApiError(error);
  return parsed.code === 'NOT_FOUND' || parsed.code === '404';
}

/**
 * Returns true if the error represents a network/connectivity failure
 * (no response received from the server).
 */
export function isNetworkError(error: unknown): boolean {
  if (
    error != null &&
    typeof error === 'object' &&
    'request' in error &&
    !('response' in error && (error as Record<string, unknown>).response != null)
  ) {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return true;
    }
  }
  return false;
}
