import { APIError, ErrorCode } from '../types/errors';

export type StreamErrorKind = 'auth' | 'rate_limited' | 'unreachable' | 'stream_dropped';

export const STREAM_ERROR_MESSAGES: Record<StreamErrorKind, string> = {
  unreachable: 'The agent is currently unavailable. Please try again in a moment.',
  auth: 'Your session has expired. Please sign in again.',
  rate_limited: "You're sending messages too quickly. Please wait a moment before trying again.",
  stream_dropped:
    'The connection was interrupted. Your message may not have been received — please try again.',
};

const USER_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: STREAM_ERROR_MESSAGES.unreachable,
  [ErrorCode.CONNECTION_TIMEOUT]: STREAM_ERROR_MESSAGES.unreachable,
  [ErrorCode.AUTHENTICATION_ERROR]: STREAM_ERROR_MESSAGES.auth,
  [ErrorCode.AUTHORIZATION_ERROR]: STREAM_ERROR_MESSAGES.auth,
  [ErrorCode.RATE_LIMITED]: STREAM_ERROR_MESSAGES.rate_limited,
  [ErrorCode.STREAM_ERROR]: STREAM_ERROR_MESSAGES.stream_dropped,
  [ErrorCode.STREAM_INTERRUPTED]: STREAM_ERROR_MESSAGES.stream_dropped,
  [ErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your message and try again.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

export class ErrorHandler {
  static create(code: ErrorCode, message: string, details?: Record<string, unknown>): APIError {
    return {
      code,
      message,
      retryable: ErrorHandler.isRecoverable(code),
      timestamp: new Date().toISOString(),
      details,
    };
  }

  static fromResponse(status: number, body?: string): APIError {
    let code: ErrorCode;
    let message: string;

    switch (status) {
      case 401:
        code = ErrorCode.AUTHENTICATION_ERROR;
        message = STREAM_ERROR_MESSAGES.auth;
        break;
      case 403:
        code = ErrorCode.AUTHORIZATION_ERROR;
        message = STREAM_ERROR_MESSAGES.auth;
        break;
      case 429: {
        code = ErrorCode.RATE_LIMITED;
        message = STREAM_ERROR_MESSAGES.rate_limited;
        break;
      }
      case 502:
      case 503:
      case 504:
        code = ErrorCode.NETWORK_ERROR;
        message = STREAM_ERROR_MESSAGES.unreachable;
        break;
      default:
        code = status >= 400 && status < 500
          ? ErrorCode.VALIDATION_ERROR
          : ErrorCode.UNKNOWN_ERROR;
        message = body || 'An unexpected error occurred. Please try again.';
    }

    return {
      code,
      message,
      status,
      retryable: ErrorHandler.isRecoverable(code),
      timestamp: new Date().toISOString(),
    };
  }

  static fromFetchError(error: unknown): APIError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return ErrorHandler.create(ErrorCode.NETWORK_ERROR, STREAM_ERROR_MESSAGES.unreachable);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return ErrorHandler.create(ErrorCode.STREAM_INTERRUPTED, STREAM_ERROR_MESSAGES.stream_dropped);
    }
    const message = error instanceof Error ? error.message : String(error);
    return ErrorHandler.create(ErrorCode.UNKNOWN_ERROR, message);
  }

  static isRecoverable(code: ErrorCode): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.STREAM_ERROR,
      ErrorCode.STREAM_INTERRUPTED,
      ErrorCode.RATE_LIMITED,
    ].includes(code);
  }

  static getUserMessage(error: APIError): string {
    return USER_MESSAGES[error.code] || USER_MESSAGES[ErrorCode.UNKNOWN_ERROR];
  }

  static getRetryDelay(retryCount: number, baseDelay = 1000): number {
    return Math.min(baseDelay * Math.pow(2, retryCount), 30000);
  }

  /**
   * Classifies a raw stream Error into a `StreamErrorKind` and returns the
   * corresponding user-friendly message.  No HTTP status codes, stack traces,
   * or technical error names are ever exposed.
   */
  static classifyStreamError(error: Error): { kind: StreamErrorKind; message: string } {
    const msg = error.message;

    // HTTP status embedded by streaming layer ("HTTP error! status: NNN")
    const httpMatch = msg.match(/HTTP error!\s*status:\s*(\d+)/i);
    if (httpMatch) {
      const code = Number.parseInt(httpMatch[1], 10);
      if (code === 401 || code === 403) {
        return { kind: 'auth', message: STREAM_ERROR_MESSAGES.auth };
      }
      if (code === 429) {
        return { kind: 'rate_limited', message: STREAM_ERROR_MESSAGES.rate_limited };
      }
      if (code >= 500) {
        return { kind: 'unreachable', message: STREAM_ERROR_MESSAGES.unreachable };
      }
    }

    // authenticatedFetch throws these plain-English strings
    if (msg.toLowerCase().includes('session expired')) {
      return { kind: 'auth', message: STREAM_ERROR_MESSAGES.auth };
    }
    if (msg.toLowerCase().includes('rate limited')) {
      return { kind: 'rate_limited', message: STREAM_ERROR_MESSAGES.rate_limited };
    }

    // Abort = stream dropped (user or server closed the connection)
    if (error.name === 'AbortError') {
      return { kind: 'stream_dropped', message: STREAM_ERROR_MESSAGES.stream_dropped };
    }

    // Network / fetch failures → agent unreachable
    if (
      error instanceof TypeError ||
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('load failed') ||
      msg.toLowerCase().includes('network request failed')
    ) {
      return { kind: 'unreachable', message: STREAM_ERROR_MESSAGES.unreachable };
    }

    // Anything else (mid-stream connection drop, etc.)
    return { kind: 'stream_dropped', message: STREAM_ERROR_MESSAGES.stream_dropped };
  }
}
