import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LANGUAGE_STORAGE_KEY, translate, useI18n } from '../src/i18n/I18nContext';
import { I18nProvider } from '../src/i18n/I18nProvider';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
import LoginPage from '../src/pages/auth/LoginPage';
import StoresPage from '../src/pages/customer/StoresPage';
import AdminUsersPage from '../src/pages/admin/AdminUsersPage';
import { AuthProvider } from '../src/context/AuthContext';
import { adminApi, authApi, storesApi } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn() }, storesApi: { list: vi.fn() }, adminApi: { users: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());

function Login() {
  return <MemoryRouter><I18nProvider><AuthProvider><LoginPage /></AuthProvider></I18nProvider></MemoryRouter>;
}

function Probe() {
  const { t, locale } = useI18n();
  return <><LanguageSwitcher /><span>{t('PENDING')}</span><output>{locale}</output></>;
}

describe('Arabic and English UI', () => {
  it('preserves unknown server messages without resolving inherited object properties', () => {
    for (const message of ['constructor', '__proto__', 'toString', 'Unrecognized server message']) {
      expect(translate('ar', message)).toBe(message);
    }
  });

  it('defaults to Arabic RTL, preserves form input on switching, and restores the saved language', () => {
    const page = render(<Login />);
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: 'customer@example.test' } });
    fireEvent.change(screen.getByLabelText('كلمة المرور'), { target: { value: 'Example123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }));
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('Email')).toHaveValue('customer@example.test');
    expect(screen.getByLabelText('Password')).toHaveValue('Example123!');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    page.unmount();
    render(<Login />);
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Arabic' }));
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { name: 'مرحبًا بعودتك' })).toBeInTheDocument();
  });

  it('translates a login failure and keeps the REST credentials unchanged', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ response: { data: { error: { message: 'Invalid credentials' } } } });
    render(<Login />);
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: 'customer@example.test' } });
    fireEvent.change(screen.getByLabelText('كلمة المرور'), { target: { value: 'Example123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('بيانات الدخول غير صحيحة');
    expect(authApi.login).toHaveBeenCalledWith('customer@example.test', 'Example123!');
    fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('renders Arabic REST loading, failure, retry and success without translating store data', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(storesApi.list).mockImplementationOnce(() => new Promise((_, no) => { reject = no; }));
    vi.mocked(storesApi.list).mockResolvedValueOnce({ data: { data: [{ id: '1', name: 'Fresh Bites' }] } } as any);
    render(<MemoryRouter><I18nProvider><StoresPage /></I18nProvider></MemoryRouter>);
    expect(screen.getByText('جارٍ البحث عن المتاجر...')).toBeInTheDocument();
    await act(async () => reject(new Error('offline')));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل المتاجر. حاول مرة أخرى.');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByText('Fresh Bites')).toBeInTheDocument();
    expect(storesApi.list).toHaveBeenLastCalledWith(1, 100);
    const query = '<script>example</script>';
    fireEvent.change(screen.getByPlaceholderText('ابحث باسم المتجر أو نوع الطعام أو العنوان...'), { target: { value: query } });
    expect(screen.getByText(`عدد المتاجر المطابقة لعبارة «${query}»: 0`)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('displays translated roles while keeping the admin REST filter identifiers unchanged', async () => {
    vi.mocked(adminApi.users).mockResolvedValue({ data: { data: [{ id: '1', first_name: 'Sara', last_name: 'Test', email: 'sara@example.test', roles: ['MERCHANT'], is_active: true, created_at: '2026-01-01' }] } } as any);
    render(<I18nProvider><AdminUsersPage /></I18nProvider>);
    expect(await screen.findByText('Sara Test')).toBeInTheDocument();
    expect(screen.getAllByText('تاجر')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'تاجر' }));
    expect(adminApi.users).toHaveBeenLastCalledWith({ page: 1, limit: 10, role: 'MERCHANT' });
    expect(screen.queryByText('MERCHANT')).not.toBeInTheDocument();
  });

  it('works when localStorage is blocked and switches API status labels and Gregorian locale', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      render(<I18nProvider><Probe /></I18nProvider>);
      expect(screen.getByText('قيد الانتظار')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('ar-SA-u-ca-gregory');
      fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }));
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(document.documentElement).toHaveAttribute('lang', 'en');
    } finally { read.mockRestore(); write.mockRestore(); }
  });
});
