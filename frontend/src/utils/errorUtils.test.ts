import { describe, it, expect } from 'vitest';
import {
  parseApiError,
  isApiError,
  getErrorMessage,
  getErrorDetails,
  isUnauthorizedError,
  isNotFoundError,
} from './errorUtils';

describe('isApiError', () => {
  it('returns true for a valid ApiError shape', () => {
    expect(isApiError({ code: 'NOT_FOUND', message: 'Resource not found' })).toBe(true);
  });

  it('returns false for objects missing required fields', () => {
    expect(isApiError({ message: 'oops' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError('string error')).toBe(false);
  });
});

describe('parseApiError', () => {
  it('returns the value as-is when it already conforms to ApiError', () => {
    const err = { code: 'VALIDATION_ERROR', message: 'Invalid input', details: ['field required'] };
    const result = parseApiError(err);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Invalid input');
  });

  it('extracts error from axios-style response.data', () => {
    const axiosError = {
      response: {
        data: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        status: 401,
      },
    };
    const result = parseApiError(axiosError);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Not authenticated');
  });

  it('extracts message from FastAPI detail field', () => {
    const axiosError = {
      response: {
        data: { detail: 'Not found.' },
        status: 404,
      },
    };
    const result = parseApiError(axiosError);
    expect(result.code).toBe('ERROR');
    expect(result.message).toBe('Not found.');
  });

  it('wraps a plain Error instance', () => {
    const result = parseApiError(new Error('Something went wrong'));
    expect(result.code).toBe('CLIENT_ERROR');
    expect(result.message).toBe('Something went wrong');
  });

  it('returns UNKNOWN_ERROR for completely unknown values', () => {
    const result = parseApiError(undefined);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('An unexpected error occurred.');
  });
});

describe('getErrorMessage', () => {
  it('returns the message from a parsed ApiError', () => {
    const err = { code: 'FORBIDDEN', message: 'Access denied' };
    expect(getErrorMessage(err)).toBe('Access denied');
  });
});

describe('getErrorDetails', () => {
  it('returns an empty array when there are no details', () => {
    expect(getErrorDetails({ code: 'ERR', message: 'oops' })).toEqual([]);
  });

  it('returns array of strings when details is an array', () => {
    const err = { code: 'VALIDATION_ERROR', message: 'bad', details: ['field a required', 'field b required'] };
    expect(getErrorDetails(err)).toEqual(['field a required', 'field b required']);
  });

  it('wraps a string details value in an array', () => {
    const err = { code: 'ERR', message: 'bad', details: 'extra info' };
    expect(getErrorDetails(err)).toEqual(['extra info']);
  });
});

describe('isUnauthorizedError', () => {
  it('returns true for axios error with status 401', () => {
    const err = { response: { status: 401, data: { code: 'UNAUTHORIZED', message: 'No token' } } };
    expect(isUnauthorizedError(err)).toBe(true);
  });

  it('returns true for ApiError with code UNAUTHORIZED', () => {
    expect(isUnauthorizedError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })).toBe(true);
  });

  it('returns false for a 403 error', () => {
    const err = { response: { status: 403, data: { code: 'FORBIDDEN', message: 'No access' } } };
    expect(isUnauthorizedError(err)).toBe(false);
  });
});

describe('isNotFoundError', () => {
  it('returns true for axios error with status 404', () => {
    const err = { response: { status: 404, data: { code: 'NOT_FOUND', message: 'Not found' } } };
    expect(isNotFoundError(err)).toBe(true);
  });

  it('returns true for ApiError with code NOT_FOUND', () => {
    expect(isNotFoundError({ code: 'NOT_FOUND', message: 'Resource missing' })).toBe(true);
  });

  it('returns false for a non-404 error', () => {
    expect(isNotFoundError({ code: 'SERVER_ERROR', message: 'Internal error' })).toBe(false);
  });
});
