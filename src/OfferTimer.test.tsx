import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfferTimer } from './OfferTimer';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('ANTI PRESSURE introductory offer preview', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:00:00'));
  });

  it('shows 190 EGP during the first hour and keeps the original start time', () => {
    const { unmount } = render(<OfferTimer />);
    expect(screen.getByText(/190 جنيه/)).toBeInTheDocument();
    expect(localStorage.getItem('anti-pressure:launch-offer-start:v1')).toBe(String(Date.now()));
    unmount();
    act(() => { vi.advanceTimersByTime(15 * 60 * 1000); });
    render(<OfferTimer />);
    expect(screen.getByText(/190 جنيه/)).toBeInTheDocument();
  });

  it('switches to 240 EGP after sixty minutes', () => {
    render(<OfferTimer />);
    act(() => { vi.advanceTimersByTime(60 * 60 * 1000); });
    expect(screen.getByText('240 جنيه')).toBeInTheDocument();
    expect(screen.queryByText(/190 جنيه/)).not.toBeInTheDocument();
  });
});
