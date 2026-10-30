import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => cleanup());

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('ANTI PRESSURE customer experience', () => {
  it('renders the approved Arabic brand homepage without admin controls', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'فُكّي الضغط!' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'القائمة الرئيسية' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /لوحة الإدارة/ })).not.toBeInTheDocument();
  });

  it('links the main CTA to the artwork builder', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /صممي كتابك الآن/ })).toHaveAttribute('href', '#design');
  });

  it('requires exactly 30 unique artworks before allowing cover selection', () => {
    window.location.hash = '#design';
    render(<App />);
    const continueButton = screen.getByRole('button', { name: /اختاري الغلاف/ });
    expect(continueButton).toBeDisabled();
    const choices = screen.getAllByRole('button', { name: '+ اختاري' });
    choices.slice(0, 30).forEach(button => fireEvent.click(button));
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(screen.getByRole('heading', { name: 'اختاري غلاف كتابك واكتبي اسمك' })).toBeInTheDocument();
  });

  it('saves cover personalization and displays the complete 30-artwork review', () => {
    window.location.hash = '#design';
    render(<App />);
    screen.getAllByRole('button', { name: '+ اختاري' }).slice(0, 30).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByRole('button', { name: /اختاري الغلاف/ }));
    fireEvent.change(screen.getByLabelText('الاسم اللي يظهر على الغلاف'), { target: { value: 'سارة' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ اختيارات الغلاف/ }));
    expect(screen.getByRole('heading', { name: 'بصي على كتابك قبل ما نكمل' })).toBeInTheDocument();
    expect(screen.getByText('سارة')).toBeInTheDocument();
    expect(screen.getAllByText(/صفحة/)).toHaveLength(30);
  });
});
