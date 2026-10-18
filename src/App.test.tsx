import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('Arabic storefront', () => {
  it('renders the main storefront in Arabic', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /خلي حاجات طفلك/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /قريبًا: كل المنتجات/ })).toBeInTheDocument();
  });
  it('switches product categories', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'ملصقات مدرسية' }));
    expect(screen.getByRole('button', { name: 'ملصقات مدرسية' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: /قريبًا: ملصقات مدرسية/ })).toBeInTheDocument();
  });
  it('shows an honest empty state when searching before products are connected', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'ابحث في المنتجات' }), { target: { value: 'اسم الطفل' } });
    expect(screen.getByText(/اسم الطفل/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مسح البحث' })).toBeInTheDocument();
  });
  it('opens and closes the empty cart notice', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /السلة/ });
    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('سلتك لسه فاضية');
    fireEvent.click(button);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
