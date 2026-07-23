import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ReconnectingBanner } from './ReconnectingBanner';
import type { StreamingState } from '../redux/slices/chats';

function makeStreamingState(overrides: Partial<StreamingState> = {}): StreamingState {
  return {
    isLoading: false,
    isConnected: false,
    isThinking: false,
    isReconnecting: false,
    reconnectAttempt: 0,
    streamDroppedMidResponse: false,
    error: null,
    currentRunId: null,
    pendingInterrupt: null,
    taskSteps: [],
    activeSubAgent: null,
    ...overrides,
  };
}

describe('ReconnectingBanner — visibility', () => {
  it('renders nothing when isReconnecting is false', () => {
    const { container } = render(
      <ReconnectingBanner streamingState={makeStreamingState()} maxRetries={3} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a banner when isReconnecting is true', () => {
    const { container } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({ isReconnecting: true, reconnectAttempt: 1 })}
        maxRetries={3}
      />,
    );
    expect(container.querySelector('.pf-v6-c-alert')).not.toBeNull();
  });
});

describe('ReconnectingBanner — user-friendly copy', () => {
  const jargonPatterns = [
    /attempt \d+\/\d+/i,               // "Attempt 1/3"
    /stream dropped mid-response/i,    // old jargon
    /resuming from last received event/i,
  ];

  it('shows no jargon during a normal reconnect', () => {
    const { container } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({ isReconnecting: true, reconnectAttempt: 1 })}
        maxRetries={3}
      />,
    );
    const text = container.textContent ?? '';
    for (const pattern of jargonPatterns) {
      expect(text).not.toMatch(pattern);
    }
  });

  it('shows no jargon when stream dropped mid-response', () => {
    const { container } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({
          isReconnecting: true,
          reconnectAttempt: 2,
          streamDroppedMidResponse: true,
        })}
        maxRetries={3}
      />,
    );
    const text = container.textContent ?? '';
    for (const pattern of jargonPatterns) {
      expect(text).not.toMatch(pattern);
    }
  });

  it('shows different copy when the last retry attempt is reached', () => {
    const { container: containerLast } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({ isReconnecting: true, reconnectAttempt: 3 })}
        maxRetries={3}
      />,
    );
    const { container: containerEarly } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({ isReconnecting: true, reconnectAttempt: 1 })}
        maxRetries={3}
      />,
    );
    expect(containerLast.textContent).not.toBe(containerEarly.textContent);
  });

  it('mentions the connection interruption in the body when stream dropped mid-response', () => {
    const { container } = render(
      <ReconnectingBanner
        streamingState={makeStreamingState({
          isReconnecting: true,
          reconnectAttempt: 1,
          streamDroppedMidResponse: true,
        })}
        maxRetries={3}
      />,
    );
    expect(container.textContent).toMatch(/interrupted/i);
  });
});
