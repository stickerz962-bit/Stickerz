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

  it('shows the demo artwork gallery and the animated open-book scene on the homepage', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: /كتاب تلوين مفتوح/ })).toBeInTheDocument();
    expect(screen.getAllByText('نموذج توضيحي').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'اختاري اللي شبهك' })).toBeInTheDocument();
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
    expect(screen.getByRole('progressbar', { name: 'عدد الرسومات المختارة' })).toHaveAttribute('aria-valuenow', '0');
    const choices = screen.getAllByRole('button', { name: '+ اختاري' });
    choices.slice(0, 30).forEach(button => fireEvent.click(button));
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'عدد الرسومات المختارة' })).toHaveAttribute('aria-valuenow', '30');
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(screen.getByRole('heading', { name: 'اختاري غلاف كتابك واكتبي اسمك' })).toBeInTheDocument();
  });

  it('keeps the introductory offer countdown visible and unchanged as the customer moves through builder stages', () => {
    window.location.hash = '#design';
    localStorage.setItem('anti-pressure-intro-offer-end-v1', String(Date.now() + 45_000));
    render(<App />);
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
    screen.getAllByRole('button', { name: '+ اختاري' }).slice(0, 30).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByRole('button', { name: /اختاري الغلاف/ }));
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('الاسم اللي يظهر على الغلاف'), { target: { value: 'سارة' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ اختيارات الغلاف/ }));
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
  });

  it('shows the regular price in the journey dock after the persisted offer expires', () => {
    window.location.hash = '#design';
    localStorage.setItem('anti-pressure-intro-offer-end-v1', String(Date.now() - 1));
    render(<App />);
    expect(screen.getByText('انتهى العرض الترحيبي')).toBeInTheDocument();
    expect(screen.getByText('240 جنيه')).toBeInTheDocument();
  });

  it('uses automatic selection order in the preview and does not expose manual reorder controls', () => {
    window.location.hash = '#design';
    render(<App />);
    screen.getAllByRole('button', { name: '+ اختاري' }).slice(0, 30).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByRole('button', { name: /اختاري الغلاف/ }));
    fireEvent.change(screen.getByLabelText('الاسم اللي يظهر على الغلاف'), { target: { value: 'سارة' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ اختيارات الغلاف/ }));
    expect(screen.getByText('قائمة مش بتخلص').parentElement).toHaveTextContent('صفحة 1');
    expect(screen.getByText('خمس دقايق كمان').parentElement).toHaveTextContent('صفحة 2');
    expect(screen.queryByRole('button', { name: /نقل .* لأعلى|نقل .* لأسفل/ })).not.toBeInTheDocument();
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
