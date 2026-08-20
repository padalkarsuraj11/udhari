import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, Eye, EyeOff, Shield, Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
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
            <span className="admin-tag">
              <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
              Platform Administration Console
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
            <label className="form-label">Admin Email</label>
            <div className="input-group">
              <Mail size={15} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="admin-email"
                type="email"
                className="input input-with-icon"
                placeholder="admin@udhari.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <Lock size={15} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="admin-password"
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
            id="admin-login-btn"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Authenticating...
              </span>
            ) : (
              <>
                <Shield size={16} />
                Sign In to Admin Console
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
          Secured access only • Platform administrators
        </p>
      </div>
    </div>
  );
}
