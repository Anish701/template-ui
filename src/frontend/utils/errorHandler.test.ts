import { describe, it, expect } from 'vitest';
import { ErrorHandler, STREAM_ERROR_MESSAGES } from './errorHandler';

describe('ErrorHandler.classifyStreamError — agent unreachable', () => {
  it('classifies 502 HTTP errors as unreachable', () => {
    const { kind, message } = ErrorHandler.classifyStreamError(
      new Error('HTTP error! status: 502'),
    );
    expect(kind).toBe('unreachable');
    expect(message).toBe(STREAM_ERROR_MESSAGES.unreachable);
    expect(message).toBe('The agent is currently unavailable. Please try again in a moment.');
  });

  it('classifies 503 HTTP errors as unreachable', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 503'));
    expect(kind).toBe('unreachable');
  });

  it('classifies 504 HTTP errors as unreachable', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 504'));
    expect(kind).toBe('unreachable');
  });

  it('classifies TypeError (fetch failure) as unreachable', () => {
    const { kind, message } = ErrorHandler.classifyStreamError(
      new TypeError('Failed to fetch'),
    );
    expect(kind).toBe('unreachable');
    expect(message).toBe(STREAM_ERROR_MESSAGES.unreachable);
  });

  it('classifies "load failed" network errors as unreachable', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('Load failed'));
    expect(kind).toBe('unreachable');
  });

  it('classifies "NetworkError" as unreachable', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('NetworkError when attempting to fetch resource'));
    expect(kind).toBe('unreachable');
  });

  it('message contains no HTTP codes or stack traces', () => {
    const { message } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 503'));
    expect(message).not.toMatch(/\d{3}/);
    expect(message).not.toMatch(/stack/i);
  });
});

describe('ErrorHandler.classifyStreamError — auth expired', () => {
  it('classifies 401 HTTP error as auth', () => {
    const { kind, message } = ErrorHandler.classifyStreamError(
      new Error('HTTP error! status: 401'),
    );
    expect(kind).toBe('auth');
    expect(message).toBe(STREAM_ERROR_MESSAGES.auth);
    expect(message).toBe('Your session has expired. Please sign in again.');
  });

  it('classifies 403 HTTP error as auth', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 403'));
    expect(kind).toBe('auth');
  });

  it('classifies "Session expired" thrown by authenticatedFetch as auth', () => {
    const { kind } = ErrorHandler.classifyStreamError(
      new Error('Session expired. Please try again.'),
    );
    expect(kind).toBe('auth');
  });

  it('message says "sign in" not "log in"', () => {
    const { message } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 401'));
    expect(message.toLowerCase()).toContain('sign in');
    expect(message.toLowerCase()).not.toContain('log in');
  });
});

describe('ErrorHandler.classifyStreamError — rate limited', () => {
  it('classifies 429 HTTP error as rate_limited', () => {
    const { kind, message } = ErrorHandler.classifyStreamError(
      new Error('HTTP error! status: 429'),
    );
    expect(kind).toBe('rate_limited');
    expect(message).toBe(STREAM_ERROR_MESSAGES.rate_limited);
    expect(message).toBe(
      "You're sending messages too quickly. Please wait a moment before trying again.",
    );
  });

  it('classifies "Rate limited" thrown by authenticatedFetch as rate_limited', () => {
    const { kind } = ErrorHandler.classifyStreamError(
      new Error('Rate limited. Retry after 5000ms'),
    );
    expect(kind).toBe('rate_limited');
  });

  it('message contains no HTTP codes', () => {
    const { message } = ErrorHandler.classifyStreamError(new Error('HTTP error! status: 429'));
    expect(message).not.toMatch(/429/);
  });
});

describe('ErrorHandler.classifyStreamError — stream dropped', () => {
  it('classifies AbortError as stream_dropped', () => {
    const abort = new DOMException('The operation was aborted', 'AbortError');
    const { kind, message } = ErrorHandler.classifyStreamError(abort as unknown as Error);
    expect(kind).toBe('stream_dropped');
    expect(message).toBe(STREAM_ERROR_MESSAGES.stream_dropped);
    expect(message).toBe(
      'The connection was interrupted. Your message may not have been received \u2014 please try again.',
    );
  });

  it('classifies unknown errors as stream_dropped', () => {
    const { kind } = ErrorHandler.classifyStreamError(new Error('unexpected mid-stream disconnect'));
    expect(kind).toBe('stream_dropped');
  });

  it('message does not expose internal error details', () => {
    const { message } = ErrorHandler.classifyStreamError(
      new Error('unexpected mid-stream disconnect'),
    );
    expect(message).not.toContain('unexpected mid-stream disconnect');
  });
});

describe('STREAM_ERROR_MESSAGES — plain language checks', () => {
  it('no message contains HTTP status codes', () => {
    for (const msg of Object.values(STREAM_ERROR_MESSAGES)) {
      expect(msg).not.toMatch(/\b[1-5]\d{2}\b/);
    }
  });

  it('no message contains stack trace keywords', () => {
    for (const msg of Object.values(STREAM_ERROR_MESSAGES)) {
      expect(msg.toLowerCase()).not.toContain('stack');
      expect(msg.toLowerCase()).not.toContain('traceback');
      expect(msg.toLowerCase()).not.toContain('error:');
    }
  });

  it('auth message says "sign in", not "log in"', () => {
    expect(STREAM_ERROR_MESSAGES.auth.toLowerCase()).toContain('sign in');
    expect(STREAM_ERROR_MESSAGES.auth.toLowerCase()).not.toContain('log in');
  });

  it('rate_limited message mentions sending messages too quickly', () => {
    expect(STREAM_ERROR_MESSAGES.rate_limited.toLowerCase()).toContain('messages too quickly');
  });

  it('unreachable message says agent is currently unavailable', () => {
    expect(STREAM_ERROR_MESSAGES.unreachable.toLowerCase()).toContain('currently unavailable');
  });

  it('stream_dropped message says connection was interrupted', () => {
    expect(STREAM_ERROR_MESSAGES.stream_dropped.toLowerCase()).toContain('connection was interrupted');
  });
});
