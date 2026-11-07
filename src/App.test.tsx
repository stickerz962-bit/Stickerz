import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./catalog/repository', () => ({
  loadCatalog: async () => ({
    source: 'firestore',
    data: {
      categories: [{ id: '1', title: 'قهوة وأكل', slug: 'coffee-food', sortOrder: 1, active: true }],
      artworks: Array.from({ length: 30 }, (_, index) => ({
        id: 'AP-' + String(index + 1).padStart(3, '0'),
        title: 'رسمة فعلية ' + (index + 1),
        categoryId: '1',
        previewAssetRef: 'data:image/png;base64,AA==',
        sortOrder: index + 1,
        version: 1,
        active: true,
      })),
      covers: ['calm', 'fun', 'flowers', 'bold', 'space'].map((id, index) => ({
        id,
        title: ['الهدوء', 'فكّيها', 'على رواق', 'مش ناقصة', 'مساحة لنفسي'][index],
        subtitle: 'غلاف معتمد',
        previewAssetRef: 'data:image/png;base64,AA==',
        sortOrder: index + 1,
        version: 1,
        active: true,
      })),
    },
  }),
}));



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

  it('shows approved catalog images and the animated open-book scene on the homepage', async () => {
    render(<App />);
    expect(screen.getByRole('img', { name: /كتاب تلوين مفتوح/ })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'رسمة فعلية 1' })).toBeInTheDocument();
    expect(screen.queryByText(/نموذج توضيحي|تجريبي/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'اختاري اللي شبهك' })).toBeInTheDocument();
  });

  it('links the main CTA to the artwork builder', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /صممي كتابك الآن/ })).toHaveAttribute('href', '#design');
  });

  it('requires exactly 30 unique artworks before allowing cover selection', async () => {
    window.location.hash = '#design';
    render(<App />);
    const continueButton = screen.getByRole('button', { name: /اختاري الغلاف/ });
    expect(continueButton).toBeDisabled();
    expect(screen.getByRole('progressbar', { name: 'عدد الرسومات المختارة' })).toHaveAttribute('aria-valuenow', '0');
    const choices = await screen.findAllByRole('button', { name: '+ اختاري' });
    choices.slice(0, 30).forEach(button => fireEvent.click(button));
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'عدد الرسومات المختارة' })).toHaveAttribute('aria-valuenow', '30');
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(screen.getByRole('heading', { name: 'اختاري غلاف كتابك واكتبي اسمك' })).toBeInTheDocument();
  });

  it('keeps the 24-hour introductory offer countdown visible across builder stages', async () => {
    window.location.hash = '#design';
    localStorage.setItem('anti-pressure-intro-offer-end-v2', String(Date.now() + 45_000));
    render(<App />);
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('عرض الـ24 ساعة · ينتهي خلال', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
    (await screen.findAllByRole('button', { name: '+ اختاري' })).slice(0, 30).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByRole('button', { name: /اختاري الغلاف/ }));
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('الاسم اللي يظهر على الغلاف'), { target: { value: 'سارة' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ اختيارات الغلاف/ }));
    expect(screen.getByText('عرضك مستمر طوال رحلتك')).toBeInTheDocument();
    expect(screen.getByText('190 جنيه')).toBeInTheDocument();
  });

  it('shows the regular price after the persisted offer expires', () => {
    window.location.hash = '#design';
    localStorage.setItem('anti-pressure-intro-offer-end-v2', String(Date.now() - 1));
    render(<App />);
    expect(screen.getByText('انتهى العرض الترحيبي')).toBeInTheDocument();
    expect(screen.getByText('240 جنيه')).toBeInTheDocument();
  });

  it('uses automatic selection order in the preview and does not expose manual reorder controls', async () => {
    window.location.hash = '#design';
    render(<App />);
    (await screen.findAllByRole('button', { name: '+ اختاري' })).slice(0, 30).forEach(button => fireEvent.click(button));
    fireEvent.click(screen.getByRole('button', { name: /اختاري الغلاف/ }));
    fireEvent.change(screen.getByLabelText('الاسم اللي يظهر على الغلاف'), { target: { value: 'سارة' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ اختيارات الغلاف/ }));
    expect(screen.getByText('رسمة فعلية 1').parentElement).toHaveTextContent('صفحة 1');
    expect(screen.getByText('رسمة فعلية 2').parentElement).toHaveTextContent('صفحة 2');
    expect(screen.queryByRole('button', { name: /نقل .* لأعلى|نقل .* لأسفل/ })).not.toBeInTheDocument();
  });

  it('saves cover personalization and displays the complete 30-artwork review', async () => {
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
