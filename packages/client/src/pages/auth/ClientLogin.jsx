import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, Eye, EyeOff, User, Lock, Key } from 'lucide-react';

export default function ClientLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!loginIdentifier || !password) {
      setError('Please enter login ID and password.');
      return;
    }

    setLoading(true);

    try {
      await signIn({ loginIdentifier, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Decorative orbs */}
      <div
        className="login-bg-orb"
        style={{ width: 500, height: 500, background: 'var(--brand-600)', top: -200, left: -200 }}
      />
      <div
        className="login-bg-orb"
        style={{ width: 400, height: 400, background: '#4338ca', bottom: -150, right: -100 }}
      />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={26} color="white" />
          </div>
          <div>
            <h1>Udhari Platform</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Trade Credit Management System
            </p>
            <span className="badge badge-brand" style={{ fontSize: 10 }}>
              <User size={10} style={{ display: 'inline', marginRight: 4 }} />
              Business Owner Portal
            </span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Login ID</label>
            <div className="input-group">
              <Key size={15} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="login-identifier"
                type="text"
                className="input input-with-icon"
                placeholder="Your business login ID"
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <Lock size={15} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="input input-with-icon"
                style={{ paddingRight: 40 }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-btn"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Signing in...
              </span>
            ) : (
              <>
                <User size={16} />
                Sign In to Your Business
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
          Contact your administrator if you need help accessing your account
        </p>
      </div>
    </div>
  );
}
