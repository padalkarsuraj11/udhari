// ============================================================
// CREATE OWNER FORM COMPONENT
// Multi-step form for admin to create new owner account
// ============================================================

import { useState } from 'react';
import { Plus, Building, User, Mail, Phone, MapPin, Key, Lock, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const BUSINESS_TYPES = [
  'Electrical',
  'Plumbing',
  'Construction',
  'Paint',
  'Hardware',
  'Building Materials',
  'Other',
];

const PLANS = [
  { value: 'Starter', label: 'Starter', description: 'Basic features for small businesses' },
  { value: 'Professional', label: 'Professional', description: 'Advanced features for growing businesses' },
  { value: 'Enterprise', label: 'Enterprise', description: 'Full platform access with priority support' },
];

export default function CreateOwnerModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'Electrical',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    plan: 'Starter',
    loginIdentifier: '',
    password: '',
    confirmPassword: '',
  });

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  function validateStep1() {
    if (!formData.businessName || !formData.businessType) {
      setError('Business name and type are required');
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!formData.ownerName || !formData.email) {
      setError('Owner name and email are required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email address');
      return false;
    }
    return true;
  }

  function validateStep3() {
    if (!formData.loginIdentifier || !formData.password) {
      setError('Login ID and password are required');
      return false;
    }
    if (formData.loginIdentifier.length < 3) {
      setError('Login ID must be at least 3 characters');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(step + 1);
    setError('');
  }

  function prevStep() {
    setStep(step - 1);
    setError('');
  }

  async function handleSubmit() {
    if (!validateStep3()) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/admin/owners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create owner');
      }

      onSuccess(data.tenant);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create owner');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      businessName: '',
      businessType: 'Electrical',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      plan: 'Starter',
      loginIdentifier: '',
      password: '',
      confirmPassword: '',
    });
    setStep(1);
    setError('');
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Plus size={20} />
              Create New Owner
            </h2>
            <p className="modal-subtitle">Step {step} of 4</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, paddingLeft: 24, paddingRight: 24 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? 'var(--brand-500)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginLeft: 24,
            marginRight: 24,
            marginBottom: 16,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div className="modal-body">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                <Building size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Business Information
              </h3>

              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Patel Electrical Traders"
                  value={formData.businessName}
                  onChange={e => updateField('businessName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Type *</label>
                <select
                  className="input"
                  value={formData.businessType}
                  onChange={e => updateField('businessType', e.target.value)}
                >
                  {BUSINESS_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subscription Plan *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PLANS.map(plan => (
                    <label
                      key={plan.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        border: `2px solid ${formData.plan === plan.value ? 'var(--brand-500)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.value}
                        checked={formData.plan === plan.value}
                        onChange={e => updateField('plan', e.target.value)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{plan.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                <User size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Owner Information
              </h3>

              <div className="form-group">
                <label className="form-label">Owner Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ramesh Patel"
                  value={formData.ownerName}
                  onChange={e => updateField('ownerName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="ramesh@patelelectrical.com"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                <MapPin size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Business Location (Optional)
              </h3>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Shop No. 15, Market Complex"
                  value={formData.address}
                  onChange={e => updateField('address', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ahmedabad"
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Gujarat"
                    value={formData.state}
                    onChange={e => updateField('state', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                <Key size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Account Credentials
              </h3>

              <div className="form-group">
                <label className="form-label">Login ID *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="PATEL001 or custom identifier"
                  value={formData.loginIdentifier}
                  onChange={e => updateField('loginIdentifier', e.target.value)}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Unique identifier for owner login (min 3 characters)
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => updateField('password', e.target.value)}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Minimum 8 characters
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                />
              </div>

              {/* Review summary */}
              <div style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Review & Confirm</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Business:</strong> {formData.businessName}</div>
                  <div><strong>Type:</strong> {formData.businessType}</div>
                  <div><strong>Owner:</strong> {formData.ownerName}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Plan:</strong> {formData.plan}</div>
                  <div><strong>Login ID:</strong> {formData.loginIdentifier}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
              <ArrowLeft size={14} />
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Create Owner
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
