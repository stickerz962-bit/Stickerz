import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('Arabic customer storefront', () => {
  it('renders the Arabic storefront without exposing admin controls', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /خلي حاجات طفلك/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /لوحة الإدارة/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'لوحة إدارة المنتجات' })).not.toBeInTheDocument();
  });

  it('switches product categories', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'ملصقات مدرسية' }));
    expect(screen.getByRole('button', { name: 'ملصقات مدرسية' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens and closes the cart notice', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /السلة/ });
    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('السلة تجريبية');
    fireEvent.click(button);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a friendly empty catalog message when no products are configured', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'الكتالوج لسه فاضي' })).toBeInTheDocument();
  });
});
