import { AlertCircle, RefreshCw, LogIn, Clock, RotateCcw } from 'lucide-react';
import { ErrorCode } from '../types/errors';
import { ErrorHandler } from '../utils/errorHandler';
import { buildAppPath } from '../lib/app-paths';

interface ChatInlineErrorProps {
  /** Raw error string from the streaming layer (e.g. `streamingState.error`). */
  rawError: string;
  onRetry?: () => void;
  className?: string;
}

interface ErrorPresentation {
  icon: React.ComponentType<{ className?: string }>;
  userMessage: string;
  actionLabel: string;
  onAction: () => void;
  actionIcon: React.ComponentType<{ className?: string }>;
}

function buildPresentation(
  rawError: string,
  onRetry?: () => void,
): ErrorPresentation {
  const apiError = ErrorHandler.fromStreamErrorMessage(rawError);
  const userMessage = ErrorHandler.getUserMessage(apiError);

  const handleRetry = () => onRetry?.();
  const handleLogin = () => {
    const redirect = encodeURIComponent(
      `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`,
    );
    globalThis.location.assign(buildAppPath(`/auth/login?redirect=${redirect}`));
  };
  const handleRefresh = () => window.location.reload();

  switch (apiError.code) {
    case ErrorCode.AUTHENTICATION_ERROR:
      return {
        icon: AlertCircle,
        userMessage,
        actionLabel: 'Log In',
        onAction: handleLogin,
        actionIcon: LogIn,
      };

    case ErrorCode.AUTHORIZATION_ERROR:
      return {
        icon: AlertCircle,
        userMessage,
        actionLabel: 'Refresh Page',
        onAction: handleRefresh,
        actionIcon: RefreshCw,
      };

    case ErrorCode.RATE_LIMITED:
      return {
        icon: Clock,
        userMessage,
        actionLabel: 'Try Again',
        onAction: handleRetry,
        actionIcon: RotateCcw,
      };

    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.CONNECTION_TIMEOUT:
      return {
        icon: AlertCircle,
        userMessage,
        actionLabel: 'Try Again',
        onAction: handleRetry,
        actionIcon: RotateCcw,
      };

    case ErrorCode.STREAM_ERROR:
    case ErrorCode.STREAM_INTERRUPTED:
      return {
        icon: AlertCircle,
        userMessage,
        actionLabel: 'Retry',
        onAction: handleRetry,
        actionIcon: RotateCcw,
      };

    default:
      return {
        icon: AlertCircle,
        userMessage,
        actionLabel: 'Try Again',
        onAction: handleRetry,
        actionIcon: RotateCcw,
      };
  }
}

export function ChatInlineError({
  rawError,
  onRetry,
  className = '',
}: ChatInlineErrorProps) {
  const { icon: Icon, userMessage, actionLabel, onAction, actionIcon: ActionIcon } =
    buildPresentation(rawError, onRetry);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 animate-fadeIn ${className}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-destructive" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card max-w-xl">
        <p className="text-sm text-foreground mb-3">{userMessage}</p>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={actionLabel}
        >
          <ActionIcon className="w-3 h-3" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
