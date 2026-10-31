import { createContext, useContext } from 'react';
import { arMessages } from './messages';

export type Language = 'ar' | 'en';
export const LANGUAGE_STORAGE_KEY = 'talabak.language';
type Values = Record<string, string | number | null | undefined>;
type Translate = (message: string | number | null | undefined, values?: Values) => string;

const statusNames: Record<string, string> = {
  ALL: 'All', ADMIN: 'Admin', CUSTOMER: 'Customer', MERCHANT: 'Merchant', DRIVER: 'Driver',
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY: 'Ready for Pickup',
  READY_FOR_PICKUP: 'Ready for Pickup', ASSIGNED: 'Assigned', PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery', IN_TRANSIT: 'In Transit', DELIVERED: 'Delivered',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected', FAILED: 'Failed',
  APPROVED: 'Approved', SUSPENDED: 'Suspended', ONLINE: 'Online', OFFLINE: 'Offline', BUSY: 'Busy',
  ACTIVE: 'Active', INACTIVE: 'Inactive', CAR: 'Car', MOTORCYCLE: 'Motorcycle', BICYCLE: 'Bicycle',
};

export function translate(language: Language, message: string | number | null | undefined, values: Values = {}): string {
  const source = String(message ?? '');
  const key = source.trim();
  if (!key) return source;
  const statusKey = key.replaceAll(' ', '_');
  const normalized = Object.hasOwn(statusNames, key) ? statusNames[key]
    : Object.hasOwn(statusNames, statusKey) ? statusNames[statusKey] : key;
  const text = language === 'ar'
    ? Object.hasOwn(arMessages, normalized) ? arMessages[normalized]
      : Object.hasOwn(arMessages, key) ? arMessages[key] : normalized
    : normalized;
  const prefix = source.match(/^\s*/)?.[0] ?? '';
  const suffix = source.match(/\s*$/)?.[0] ?? '';
  return prefix + text.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name] ?? '') : token) + suffix;
}

export function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch { /* Storage can be unavailable in private/restricted browsers. */ }
  return 'ar';
}

export interface I18nValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: Translate;
}

// English fallback lets isolated reusable components retain their original copy.
export const I18nContext = createContext<I18nValue>({
  language: 'en', locale: 'en-SA', setLanguage: () => {}, t: (message, values) => translate('en', message, values),
});

export function useI18n() { return useContext(I18nContext); }
