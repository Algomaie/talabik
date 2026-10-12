import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package, Eye, EyeOff, ArrowRight, User, Briefcase, Truck } from 'lucide-react';
import './Auth.css';

const ROLES = [
  { value: 'CUSTOMER', label: 'Customer', icon: User, desc: 'Order from stores' },
  { value: 'MERCHANT', label: 'Merchant', icon: Briefcase, desc: 'Manage your store' },
  { value: 'DRIVER', label: 'Driver', icon: Truck, desc: 'Deliver orders' },
];

export default function RegisterPage() {
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
          <h1>Talbak</h1>
          <p>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Step Indicator */}
          <div className="register-steps">
            <div className={`register-step ${step >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <small>Role</small>
            </div>
            <div className="register-step-line" />
            <div className={`register-step ${step >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <small>Details</small>
            </div>
          </div>

          {error && <div className="auth-error animate-fade-in">{error}</div>}

          {step === 1 && (
            <>
              <h2>Choose Your Role</h2>
              <p className="auth-subtitle">How will you use Talbak?</p>

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
                        <div className="role-label">{r.label}</div>
                        <div className="role-desc">{r.desc}</div>
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
                Continue <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Your Information</h2>
              <p className="auth-subtitle">Fill in your details to get started</p>

              <div className="register-row">
                <div className="input-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className="input"
                    placeholder="Ahmed"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="input"
                    placeholder="Ali"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="regEmail">Email</label>
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
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  placeholder="+966 5XX XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="regPassword">Password</label>
                <div className="password-wrapper">
                  <input
                    id="regPassword"
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPw">Confirm Password</label>
                <input
                  id="confirmPw"
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
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
                  Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                  {loading ? (
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  ) : (
                    <>Create Account <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </>
          )}

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
