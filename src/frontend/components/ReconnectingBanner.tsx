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

  const attempt = streamingState.reconnectAttempt ?? 0;
  const isLastAttempt = attempt >= maxRetries;

  const title = isLastAttempt
    ? 'Having trouble connecting…'
    : 'Reconnecting…';

  const body = streamingState.streamDroppedMidResponse
    ? 'The connection was interrupted mid-response. Picking up where we left off…'
    : isLastAttempt
      ? 'Still trying to reach the agent. This may take a moment.'
      : 'Lost connection to the agent. Trying again automatically…';

  return (
    <Alert variant="warning" isInline title={title}>
      {body}
    </Alert>
  );
}
