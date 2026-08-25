// ============================================================
// CREATE OWNER FORM COMPONENT
// Multi-step wizard for admin to create a new owner account.
// Steps:
//   1. Business Information (name, type, plan)
//   2. Owner & Contact Info (name, email, phone, location, country)
//   3. Account Credentials (loginIdentifier, password)
//   4. Review & Confirm
// ============================================================

import { useState } from 'react';
import {
  Plus, Building, User, Mail, Phone, MapPin, Key, Lock,
  ArrowRight, ArrowLeft, Check, Globe, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  { value: 'Starter',      label: 'Starter',      description: 'Basic features for small businesses' },
  { value: 'Professional', label: 'Professional',  description: 'Advanced features for growing businesses' },
  { value: 'Enterprise',   label: 'Enterprise',    description: 'Full platform access with priority support' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

const INITIAL_FORM = {
  businessName:    '',
  businessType:    'Electrical',
  plan:            'Starter',
  ownerName:       '',
  email:           '',
  phone:           '',
  address:         '',
  city:            '',
  state:           '',
  country:         'India',
  loginIdentifier: '',
  password:        '',
  confirmPassword: '',
};

export default function CreateOwnerModal({ isOpen, onClose, onSuccess }) {
  const { session } = useAuth();   // ← get token from auth context (not localStorage)
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  // ---- Validation ----
  function validateStep1() {
    if (!formData.businessName.trim()) { setError('Business name is required'); return false; }
    if (!formData.businessType)        { setError('Business type is required'); return false; }
    return true;
  }

  function validateStep2() {
    if (!formData.ownerName.trim()) { setError('Owner name is required'); return false; }
    if (!formData.email.trim())     { setError('Email address is required'); return false; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(formData.email)) { setError('Please enter a valid email address'); return false; }
    return true;
  }

  function validateStep3() {
    if (!formData.loginIdentifier.trim()) { setError('Login ID is required'); return false; }
    if (formData.loginIdentifier.length < 3) { setError('Login ID must be at least 3 characters'); return false; }
    if (/\s/.test(formData.loginIdentifier)) { setError('Login ID cannot contain spaces'); return false; }
    if (!formData.password)               { setError('Password is required'); return false; }
    if (formData.password.length < 8)     { setError('Password must be at least 8 characters'); return false; }
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
    setStep(s => s + 1);
    setError('');
  }

  function prevStep() {
    setStep(s => s - 1);
    setError('');
  }

  async function handleSubmit() {
    if (!validateStep3()) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

      // Use session token from auth context — NOT localStorage directly
      const token = session?.access_token;
      if (!token) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`${apiUrl}/admin/owners`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName:    formData.businessName.trim(),
          businessType:    formData.businessType,
          ownerName:       formData.ownerName.trim(),
          email:           formData.email.trim().toLowerCase(),
          phone:           formData.phone.trim() || undefined,
          address:         formData.address.trim() || undefined,
          city:            formData.city.trim() || undefined,
          state:           formData.state || undefined,
          country:         formData.country || 'India',
          plan:            formData.plan,
          loginIdentifier: formData.loginIdentifier.trim().toUpperCase(),
          password:        formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Specific error messages for known cases
        if (data.error === 'DUPLICATE_EMAIL') {
          setError('An owner with this email address already exists.');
        } else if (data.error === 'DUPLICATE_IDENTIFIER') {
          setError('This Login ID is already taken. Please choose a different one.');
        } else {
          setError(data.message || 'Failed to create owner. Please try again.');
        }
        return;
      }

      onSuccess(data.tenant);
      resetForm();
      onClose();
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Create owner error:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData(INITIAL_FORM);
    setStep(1);
    setError('');
    setShowPw(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  const STEP_TITLES = [
    'Business Information',
    'Owner & Location',
    'Account Credentials',
    'Review & Create',
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 600 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Plus size={20} />
              Create New Owner
            </h2>
            <p className="modal-subtitle">
              Step {step} of 4 — {STEP_TITLES[step - 1]}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, paddingLeft: 24, paddingRight: 24 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: s <= step ? 'var(--brand-500)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            marginLeft: 24, marginRight: 24, marginBottom: 16,
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

        {/* Body */}
        <div className="modal-body">

          {/* ─── STEP 1: Business Information ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={16} /> Business Information
              </h3>

              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input
                  id="create-owner-business-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Patel Electrical Traders"
                  value={formData.businessName}
                  onChange={e => updateField('businessName', e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Type *</label>
                <select
                  id="create-owner-business-type"
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
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 12,
                        border: `2px solid ${formData.plan === plan.value ? 'var(--brand-500)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        background: formData.plan === plan.value ? 'rgba(99,102,241,0.05)' : 'transparent',
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
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{plan.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{plan.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Owner & Location ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} /> Owner & Location
              </h3>

              <div className="form-group">
                <label className="form-label">Owner Full Name *</label>
                <input
                  id="create-owner-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Ramesh Patel"
                  value={formData.ownerName}
                  onChange={e => updateField('ownerName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <div className="input-group">
                  <Mail size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="create-owner-email"
                    type="email"
                    className="input input-with-icon"
                    placeholder="owner@business.com"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-group">
                  <Phone size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="create-owner-phone"
                    type="tel"
                    className="input input-with-icon"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <div className="input-group">
                  <MapPin size={14} className="input-icon" style={{ top: 14 }} />
                  <input
                    id="create-owner-address"
                    type="text"
                    className="input input-with-icon"
                    placeholder="Shop No. 15, Market Complex"
                    value={formData.address}
                    onChange={e => updateField('address', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    id="create-owner-city"
                    type="text"
                    className="input"
                    placeholder="Ahmedabad"
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <select
                    id="create-owner-state"
                    className="input"
                    value={formData.state}
                    onChange={e => updateField('state', e.target.value)}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <div className="input-group">
                  <Globe size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="create-owner-country"
                    type="text"
                    className="input input-with-icon"
                    placeholder="India"
                    value={formData.country}
                    onChange={e => updateField('country', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Account Credentials ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={16} /> Account Credentials
              </h3>

              <div className="form-group">
                <label className="form-label">Login ID *</label>
                <input
                  id="create-owner-login-id"
                  type="text"
                  className="input"
                  placeholder="e.g. PATEL001"
                  value={formData.loginIdentifier}
                  onChange={e => updateField('loginIdentifier', e.target.value.toUpperCase())}
                  autoComplete="off"
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Unique identifier for owner login. Min 3 characters, no spaces.
                  Will be auto-converted to uppercase.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="input-group">
                  <Lock size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="create-owner-password"
                    type={showPw ? 'text' : 'password'}
                    className="input input-with-icon"
                    style={{ paddingRight: 40 }}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => updateField('password', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Minimum 8 characters. Share this with the owner securely.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div className="input-group">
                  <Lock size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="create-owner-confirm-password"
                    type={showPw ? 'text' : 'password'}
                    className="input input-with-icon"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 4: Review & Confirm ─── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={16} /> Review & Confirm
              </h3>

              <div style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <ReviewSection title="Business">
                  <ReviewRow label="Business Name" value={formData.businessName} />
                  <ReviewRow label="Type"          value={formData.businessType} />
                  <ReviewRow label="Plan"          value={formData.plan} />
                </ReviewSection>

                <ReviewSection title="Owner">
                  <ReviewRow label="Name"    value={formData.ownerName} />
                  <ReviewRow label="Email"   value={formData.email} />
                  <ReviewRow label="Phone"   value={formData.phone || '—'} />
                </ReviewSection>

                {(formData.city || formData.state || formData.country) && (
                  <ReviewSection title="Location">
                    {formData.address && <ReviewRow label="Address" value={formData.address} />}
                    {formData.city    && <ReviewRow label="City"    value={formData.city} />}
                    {formData.state   && <ReviewRow label="State"   value={formData.state} />}
                    <ReviewRow label="Country" value={formData.country} />
                  </ReviewSection>
                )}

                <ReviewSection title="Account" last>
                  <ReviewRow label="Login ID" value={formData.loginIdentifier} mono />
                  <ReviewRow label="Password" value="••••••••" />
                </ReviewSection>
              </div>

              <div style={{
                padding: '10px 14px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                ℹ️ Clicking "Create Owner" will create a Supabase auth account and business tenant.
                The owner can immediately login at the client portal with their Login ID and password.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              id="create-owner-submit"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Creating Owner...
                </>
              ) : (
                <>
                  <Check size={14} /> Create Owner
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review sub-components ──
function ReviewSection({ title, children, last }) {
  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  );
}
