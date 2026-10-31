import { Languages } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return <button type="button" className="language-switcher"
    aria-label={t(language === 'ar' ? 'Switch to English' : 'Switch to Arabic')}
    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
    <Languages size={18} aria-hidden="true" />
    <span lang={language === 'ar' ? 'en' : 'ar'}>{language === 'ar' ? 'English' : 'العربية'}</span>
  </button>;
}
