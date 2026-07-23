import { APIError, ErrorCode } from '../types/errors';

/**
 * User-facing messages — no HTTP codes, no stack traces, no internal jargon.
 * Each message is phrased so the user knows what happened and what to do next.
 */
const USER_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]:
    'The agent is currently unreachable. Check your network connection and try again.',
  [ErrorCode.CONNECTION_TIMEOUT]:
    'The agent took too long to respond. Please try again.',
  [ErrorCode.AUTHENTICATION_ERROR]:
    'Your session has expired. Please log in again to continue.',
  [ErrorCode.AUTHORIZATION_ERROR]:
    "You don't have permission to use this feature. Contact your administrator if you think this is a mistake.",
  [ErrorCode.RATE_LIMITED]:
    "You've sent too many messages. Please wait a moment before trying again.",
  [ErrorCode.STREAM_ERROR]:
    'The response was interrupted unexpectedly. Your message was received — try again to get a response.',
  [ErrorCode.STREAM_INTERRUPTED]:
    'The connection dropped while the agent was responding. Try again to resume.',
  [ErrorCode.VALIDATION_ERROR]:
    'Your message could not be processed. Please check your input and try again.',
  [ErrorCode.UNKNOWN_ERROR]:
    'Something went wrong. Please try again or refresh the page.',
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
        message = 'Authentication required';
        break;
      case 403:
        code = ErrorCode.AUTHORIZATION_ERROR;
        message = 'Access denied';
        break;
      case 429: {
        code = ErrorCode.RATE_LIMITED;
        message = 'Rate limited';
        break;
      }
      case 502:
      case 503:
      case 504:
        code = ErrorCode.NETWORK_ERROR;
        message = 'Service unavailable';
        break;
      default:
        code = status >= 400 && status < 500
          ? ErrorCode.VALIDATION_ERROR
          : ErrorCode.UNKNOWN_ERROR;
        message = body || 'Request failed';
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
    // `fetch()` only throws TypeError for network failures (never for HTTP errors),
    // so we can classify any TypeError from fetch as a network error regardless of
    // the message text — which differs across browsers (Chrome: "Failed to fetch",
    // Firefox: "NetworkError…", Safari: "Load failed").
    if (error instanceof TypeError) {
      return ErrorHandler.create(ErrorCode.NETWORK_ERROR, error.message);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return ErrorHandler.create(ErrorCode.STREAM_INTERRUPTED, 'Request was cancelled');
    }
    const message = error instanceof Error ? error.message : String(error);
    return ErrorHandler.create(ErrorCode.UNKNOWN_ERROR, message);
  }

  /**
   * Classify a raw error string from the streaming layer (e.g. from Redux
   * `streamingState.error`) into a structured APIError with a user-friendly message.
   *
   * Raw strings may contain technical details like HTTP status codes or internal
   * error names — this method shields the UI from them.
   */
  static fromStreamErrorMessage(raw: string): APIError {
    const lower = raw.toLowerCase();

    // HTTP status code patterns, e.g. "HTTP error! status: 401"
    const httpMatch = raw.match(/status:\s*(\d+)/i);
    if (httpMatch) {
      const status = Number.parseInt(httpMatch[1], 10);
      return ErrorHandler.fromResponse(status);
    }

    // Auth / session
    if (
      lower.includes('session expired') ||
      lower.includes('unauthorized') ||
      lower.includes('unauthenticated') ||
      lower.includes('401')
    ) {
      return ErrorHandler.create(ErrorCode.AUTHENTICATION_ERROR, raw);
    }

    // Forbidden / permission
    if (lower.includes('forbidden') || lower.includes('403')) {
      return ErrorHandler.create(ErrorCode.AUTHORIZATION_ERROR, raw);
    }

    // Rate limited
    if (
      lower.includes('rate limit') ||
      lower.includes('too many request') ||
      lower.includes('429')
    ) {
      return ErrorHandler.create(ErrorCode.RATE_LIMITED, raw);
    }

    // Network / connectivity
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('load failed') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound') ||
      lower.includes('unreachable') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504')
    ) {
      return ErrorHandler.create(ErrorCode.NETWORK_ERROR, raw);
    }

    // Stream / connection dropped
    if (
      lower.includes('stream') ||
      lower.includes('sse') ||
      lower.includes('aborted') ||
      lower.includes('connection closed') ||
      lower.includes('connection lost')
    ) {
      return ErrorHandler.create(ErrorCode.STREAM_INTERRUPTED, raw);
    }

    return ErrorHandler.create(ErrorCode.UNKNOWN_ERROR, raw);
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
    return USER_MESSAGES[error.code] ?? USER_MESSAGES[ErrorCode.UNKNOWN_ERROR];
  }

  static getRetryDelay(retryCount: number, baseDelay = 1000): number {
    return Math.min(baseDelay * 2 ** retryCount, 30000);
  }
}
