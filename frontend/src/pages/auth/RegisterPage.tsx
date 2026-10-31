import { useI18n } from '../../i18n/I18nContext';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, Eye, EyeOff, ArrowRight, User, Briefcase, Truck } from 'lucide-react';
import './Auth.css';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const ROLES = [
  { value: 'CUSTOMER', label: 'Customer', icon: User, desc: 'Order from stores' },
  { value: 'MERCHANT', label: 'Merchant', icon: Briefcase, desc: 'Manage your store' },
  { value: 'DRIVER', label: 'Driver', icon: Truck, desc: 'Deliver orders' },
];

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('CUSTOMER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ firstName, lastName, email, phone, password, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-language"><LanguageSwitcher /></div>
      <div className="auth-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="auth-container animate-scale-in" style={{ maxWidth: 480 }}>
        <div className="auth-brand">
          <div className="auth-logo">
            <Package size={32} />
          </div>
          <h1>{t("Talbak")}</h1>
          <p>{t("Create your account")}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Step Indicator */}
          <div className="register-steps">
            <div className={`register-step ${step >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <small>{t("Role")}</small>
            </div>
            <div className="register-step-line" />
            <div className={`register-step ${step >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <small>{t("Details")}</small>
            </div>
          </div>

          {error && <div className="auth-error animate-fade-in">{t(error)}</div>}

          {step === 1 && (
            <>
              <h2>{t("Choose Your Role")}</h2>
              <p className="auth-subtitle">{t("How will you use Talbak?")}</p>

              <div className="role-selector">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      className={`role-option ${role === r.value ? 'selected' : ''}`}
                      onClick={() => setRole(r.value)}
                    >
                      <div className="role-icon">
                        <Icon size={24} />
                      </div>
                      <div>
                        <div className="role-label">{t(r.label)}</div>
                        <div className="role-desc">{t(r.desc)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                onClick={() => setStep(2)}
              >
                {t("Continue ")}<ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2>{t("Your Information")}</h2>
              <p className="auth-subtitle">{t("Fill in your details to get started")}</p>

              <div className="register-row">
                <div className="input-group">
                  <label htmlFor="firstName">{t("First Name")}</label>
                  <input
                    id="firstName"
                    type="text"
                    className="input"
                    placeholder={t("Ahmed")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">{t("Last Name")}</label>
                  <input
                    id="lastName"
                    type="text"
                    className="input"
                    placeholder={t("Ali")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="regEmail">{t("Email")}</label>
                <input
                  id="regEmail"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="phone">{t("Phone")}</label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  placeholder={t("+966 5XX XXX XXXX")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="regPassword">{t("Password")}</label>
                <div className="password-wrapper">
                  <input
                    id="regPassword"
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    placeholder={t("Min 8 characters")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button type="button" aria-label={showPw ? t('Hide password') : t('Show password')} className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPw">{t("Confirm Password")}</label>
                <input
                  id="confirmPw"
                  type="password"
                  className="input"
                  placeholder={t("Re-enter password")}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                />
              </div>

              <div className="register-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                >
                  {t("Back")}</button>
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                  {loading ? (
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  ) : (
                    <>{t("Create Account ")}<ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </>
          )}

          <p className="auth-subtitle">
            {t("Merchant and driver accounts require administrator approval before managing stores or deliveries.")}</p>
          <p className="auth-footer">
            {t("Already have an account? ")}<Link to="/login">{t("Sign in")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
