import { describe, it, expect } from 'vitest';
import { ErrorHandler } from './errorHandler';
import { ErrorCode } from '../types/errors';

describe('ErrorHandler.fromStreamErrorMessage — HTTP status patterns', () => {
  it('classifies HTTP 401 as AUTHENTICATION_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 401');
    expect(err.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });

  it('classifies HTTP 403 as AUTHORIZATION_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 403');
    expect(err.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
  });

  it('classifies HTTP 429 as RATE_LIMITED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 429');
    expect(err.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it('classifies HTTP 502 as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 502');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('classifies HTTP 503 as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 503');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('classifies HTTP 504 as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('HTTP error! status: 504');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });
});

describe('ErrorHandler.fromStreamErrorMessage — network error patterns', () => {
  it('classifies "Failed to fetch" as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('Failed to fetch');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('classifies "NetworkError" as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('NetworkError when attempting to fetch resource');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('classifies "Load failed" (Safari) as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('Load failed');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('classifies "network request failed" as NETWORK_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('TypeError: network request failed');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
  });
});

describe('ErrorHandler.fromStreamErrorMessage — auth/session patterns', () => {
  it('classifies "session expired" message as AUTHENTICATION_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('Session expired. Please try again.');
    expect(err.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });

  it('classifies "unauthorized" message as AUTHENTICATION_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('unauthorized');
    expect(err.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });
});

describe('ErrorHandler.fromStreamErrorMessage — rate limit patterns', () => {
  it('classifies "rate limit" text as RATE_LIMITED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('rate limit exceeded');
    expect(err.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it('classifies "Rate limited. Retry after 5000ms" as RATE_LIMITED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('Rate limited. Retry after 5000ms');
    expect(err.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it('classifies "too many requests" as RATE_LIMITED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('too many requests sent');
    expect(err.code).toBe(ErrorCode.RATE_LIMITED);
  });
});

describe('ErrorHandler.fromStreamErrorMessage — stream drop patterns', () => {
  it('classifies "stream" message as STREAM_INTERRUPTED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('stream connection closed');
    expect(err.code).toBe(ErrorCode.STREAM_INTERRUPTED);
  });

  it('classifies "connection closed" as STREAM_INTERRUPTED', () => {
    const err = ErrorHandler.fromStreamErrorMessage('connection closed unexpectedly');
    expect(err.code).toBe(ErrorCode.STREAM_INTERRUPTED);
  });
});

describe('ErrorHandler.fromStreamErrorMessage — unknown fallback', () => {
  it('classifies an unrecognised message as UNKNOWN_ERROR', () => {
    const err = ErrorHandler.fromStreamErrorMessage('something completely unexpected happened');
    expect(err.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });
});

describe('ErrorHandler.getUserMessage — no technical jargon', () => {
  const jargonPatterns = [
    /\b4\d\d\b/,          // HTTP 4xx
    /\b5\d\d\b/,          // HTTP 5xx
    /http error/i,
    /stack trace/i,
    /typeerror/i,
    /uncaught/i,
    /\bms\b/,             // milliseconds
  ];

  for (const code of Object.values(ErrorCode)) {
    it(`getUserMessage for ${code} contains no technical jargon`, () => {
      const apiError = ErrorHandler.create(code as ErrorCode, 'internal raw message');
      const msg = ErrorHandler.getUserMessage(apiError);
      for (const pattern of jargonPatterns) {
        expect(msg).not.toMatch(pattern);
      }
    });
  }

  it('getUserMessage is non-empty for every error code', () => {
    for (const code of Object.values(ErrorCode)) {
      const apiError = ErrorHandler.create(code as ErrorCode, 'raw');
      expect(ErrorHandler.getUserMessage(apiError).length).toBeGreaterThan(0);
    }
  });
});

describe('ErrorHandler.getUserMessage — actionable guidance', () => {
  it('NETWORK_ERROR message tells user to try again', () => {
    const err = ErrorHandler.create(ErrorCode.NETWORK_ERROR, 'raw');
    expect(ErrorHandler.getUserMessage(err)).toMatch(/try again/i);
  });

  it('AUTHENTICATION_ERROR message tells user to log in', () => {
    const err = ErrorHandler.create(ErrorCode.AUTHENTICATION_ERROR, 'raw');
    expect(ErrorHandler.getUserMessage(err)).toMatch(/log in/i);
  });

  it('RATE_LIMITED message tells user to wait', () => {
    const err = ErrorHandler.create(ErrorCode.RATE_LIMITED, 'raw');
    expect(ErrorHandler.getUserMessage(err)).toMatch(/wait/i);
  });

  it('STREAM_INTERRUPTED message tells user to try again', () => {
    const err = ErrorHandler.create(ErrorCode.STREAM_INTERRUPTED, 'raw');
    expect(ErrorHandler.getUserMessage(err)).toMatch(/try again/i);
  });
});
