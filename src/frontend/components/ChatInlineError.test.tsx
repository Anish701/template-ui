import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { ChatInlineError } from './ChatInlineError';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ChatInlineError — renders without crashing', () => {
  it('renders for a network error', () => {
    renderWithRouter(<ChatInlineError rawError="Failed to fetch" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders for a session-expired error', () => {
    renderWithRouter(<ChatInlineError rawError="Session expired. Please try again." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders for a rate-limit error', () => {
    renderWithRouter(<ChatInlineError rawError="rate limit exceeded" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders for a stream-drop error', () => {
    renderWithRouter(<ChatInlineError rawError="stream connection closed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders for an HTTP 401 error string', () => {
    renderWithRouter(<ChatInlineError rawError="HTTP error! status: 401" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ChatInlineError — user-facing copy has no technical jargon', () => {
  const jargonPatterns = [
    /\b4\d\d\b/,         // HTTP 4xx
    /\b5\d\d\b/,         // HTTP 5xx
    /http error/i,
    /typeerror/i,
    /stack trace/i,
    /\bms\b/,            // milliseconds
  ];

  const scenarios = [
    { label: 'agent unreachable', raw: 'Failed to fetch' },
    { label: 'auth expired (401)', raw: 'HTTP error! status: 401' },
    { label: 'forbidden (403)', raw: 'HTTP error! status: 403' },
    { label: 'rate limited (429)', raw: 'HTTP error! status: 429' },
    { label: 'stream dropped', raw: 'stream connection closed' },
    { label: 'service unavailable (503)', raw: 'HTTP error! status: 503' },
  ];

  for (const { label, raw } of scenarios) {
    it(`shows no jargon for: ${label}`, () => {
      const { container } = renderWithRouter(<ChatInlineError rawError={raw} />);
      const text = container.textContent ?? '';
      for (const pattern of jargonPatterns) {
        expect(text).not.toMatch(pattern);
      }
    });
  }
});

describe('ChatInlineError — action buttons', () => {
  beforeEach(() => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: vi.fn(),
      reload: vi.fn(),
      pathname: '/chat/abc',
      search: '',
      hash: '',
    });
  });

  it('calls onRetry when "Try Again" is clicked for a network error', () => {
    const onRetry = vi.fn();
    renderWithRouter(<ChatInlineError rawError="Failed to fetch" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when "Retry" is clicked for a stream-drop error', () => {
    const onRetry = vi.fn();
    renderWithRouter(<ChatInlineError rawError="stream dropped mid-response" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a "Log In" button for auth expired errors', () => {
    renderWithRouter(<ChatInlineError rawError="Session expired. Please try again." />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows a "Try Again" button for rate-limit errors', () => {
    const onRetry = vi.fn();
    renderWithRouter(<ChatInlineError rawError="rate limit exceeded" onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('ChatInlineError — accessibility', () => {
  it('has role="alert" so screen readers announce immediately', () => {
    const { container } = renderWithRouter(<ChatInlineError rawError="Failed to fetch" />);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('has aria-live="assertive"', () => {
    const { container } = renderWithRouter(<ChatInlineError rawError="Failed to fetch" />);
    const el = container.querySelector('[aria-live="assertive"]');
    expect(el).not.toBeNull();
  });
});
