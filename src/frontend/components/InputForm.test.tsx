import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { InputForm } from './InputForm';

const noop = () => {};

describe('InputForm — rate limit UX', () => {
  it('renders rate-limit banner when isRateLimited is true', () => {
    const { container } = render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={10}
      />,
    );
    expect(container.querySelector('.pf-v6-c-alert')).not.toBeNull();
  });

  it('rate-limit banner contains no technical jargon', () => {
    const { container } = render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={10}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/429/);
    expect(text).not.toMatch(/rate limited\./i);
    expect(text).not.toMatch(/retry after/i);
  });

  it('banner title says "sent too many messages"', () => {
    render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={5}
      />,
    );
    expect(screen.getByText(/too many messages/i)).toBeInTheDocument();
  });

  it('banner body tells user how many seconds to wait', () => {
    render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={15}
      />,
    );
    expect(screen.getByText(/15 second/i)).toBeInTheDocument();
  });

  it('submit button is disabled while rate limited', () => {
    render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={5}
      />,
    );
    const submitBtn = screen.getByRole('button', { name: /wait/i });
    expect(submitBtn).toBeDisabled();
  });

  it('does not render rate-limit banner when isRateLimited is false', () => {
    render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited={false}
        rateLimitRemainingSeconds={0}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses singular "second" when countdown is 1', () => {
    render(
      <InputForm
        onSubmit={noop}
        onCancel={noop}
        isLoading={false}
        hasHistory={false}
        isRateLimited
        rateLimitRemainingSeconds={1}
      />,
    );
    expect(screen.getByText(/1 second before/i)).toBeInTheDocument();
  });
});
