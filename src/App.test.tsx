import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('Arabic storefront and preview admin', () => {
  it('renders the Arabic storefront and admin entry point', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /خلي حاجات طفلك/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'لوحة الإدارة' })).toBeInTheDocument();
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

  it('opens the product admin from the hash route', () => {
    window.location.hash = '#admin';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'لوحة إدارة المنتجات' })).toBeInTheDocument();
    expect(screen.getByLabelText('اسم المنتج')).toBeInTheDocument();
    expect(screen.getByLabelText('السعر بالجنيه المصري')).toBeInTheDocument();
  });

  it('adds a priced product to local preview storage', () => {
    window.location.hash = '#admin';
    render(<App />);
    fireEvent.change(screen.getByLabelText('اسم المنتج'), { target: { value: 'ملصقات الاسم' } });
    fireEvent.change(screen.getByLabelText('السعر بالجنيه المصري'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المنتج' }));
    expect(screen.getByText('ملصقات الاسم')).toBeInTheDocument();
    expect(screen.getByText(/١٢٠/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('stickerz-preview-products-v1') || '[]')).toHaveLength(1);
  });
});
