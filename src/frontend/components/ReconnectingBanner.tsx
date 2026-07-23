import { Alert } from '@patternfly/react-core';
import type { StreamingState } from '@/redux/slices/chats';

interface ReconnectingBannerProps {
  streamingState: StreamingState;
  maxRetries: number;
}

export function ReconnectingBanner({ streamingState, maxRetries }: ReconnectingBannerProps) {
  if (!streamingState.isReconnecting) {
    return null;
  }

  const attemptText = `Reconnecting… attempt ${streamingState.reconnectAttempt} of ${maxRetries}.`;
  const midResponseNote = streamingState.streamDroppedMidResponse
    ? ' The connection was briefly interrupted — we\'ll pick up where we left off.'
    : '';

  return (
    <Alert variant="warning" isInline title="Connection lost — trying to reconnect">
      {attemptText}{midResponseNote}
    </Alert>
  );
}
