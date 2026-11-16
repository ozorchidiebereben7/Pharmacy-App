import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { FieldError } from '../components/FieldError';
import { verifyPin } from '../lib/auth';

function PinField({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
    </div>
  );
}

export default function PinChangeScreen() {
  const { engine, currentUser, changePin, requestReauth } = useApp();
  const navigate = useNavigate();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const apprentices = useMemo(
    () => (currentUser.role === 'owner' ? engine.all(`SELECT * FROM users WHERE role = 'apprentice' AND active = 1`) : []),
    [engine, currentUser.role]
  );

  const errors = {
    currentPin: currentPin.length !== 4 ? 'Enter your current 4-digit PIN.' : '',
    newPin: newPin.length !== 4 ? 'New PIN must be 4 digits.' : '',
    confirmPin: confirmPin !== newPin ? 'PINs do not match.' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    setSuccess('');
    if (hasErrors) return;
    const user = engine.one(`SELECT * FROM users WHERE id = ?`, [currentUser.id]);
    const valid = await verifyPin(currentPin, user.pin_hash);
    if (!valid) {
      setError('Current PIN is incorrect.');
      return;
    }
    setSaving(true);
    try {
      await changePin(currentUser.id, newPin);
      setSuccess('PIN updated.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  const resetErrors = {
    resetTarget: !resetTarget ? 'Choose a staff member.' : '',
    resetPin: resetPin.length !== 4 ? 'New PIN must be 4 digits.' : '',
    resetConfirm: resetConfirm !== resetPin ? 'PINs do not match.' : '',
  };
  const hasResetErrors = Object.values(resetErrors).some(Boolean);

  const submitReset = async (e) => {
    e.preventDefault();
    setResetSubmitted(true);
    setResetError('');
    setResetSuccess('');
    if (hasResetErrors) return;
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setResetSaving(true);
    try {
      await changePin(resetTarget, resetPin);
      setResetSuccess('Apprentice PIN reset.');
      setResetPin('');
      setResetConfirm('');
      setResetSubmitted(false);
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Change PIN" onBack={() => navigate(-1)} />
      <div className="screen-body stack">
        <form className="card stack" onSubmit={submit}>
          <h2 style={{ margin: 0 }}>My PIN</h2>
          {success && <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-3)' }}>{success}</div>}
          {error && <FieldError message={error} />}
          <div className={submitted && errors.currentPin ? 'has-error' : ''}>
            <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />
            {submitted && <FieldError message={errors.currentPin} />}
          </div>
          <div className={submitted && errors.newPin ? 'has-error' : ''}>
            <PinField label="New PIN" value={newPin} onChange={setNewPin} />
            {submitted && <FieldError message={errors.newPin} />}
          </div>
          <div className={submitted && errors.confirmPin ? 'has-error' : ''}>
            <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} />
            {submitted && <FieldError message={errors.confirmPin} />}
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update PIN'}</button>
        </form>

        {currentUser.role === 'owner' && (
          <form className="card stack" onSubmit={submitReset}>
            <div className="row-between">
              <h2 style={{ margin: 0 }}>Reset apprentice PIN</h2>
              <button type="button" className="link-btn" onClick={() => navigate('/staff')}>
                Manage staff →
              </button>
            </div>
            {resetSuccess && <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-3)' }}>{resetSuccess}</div>}
            {resetError && <FieldError message={resetError} />}
            <div className={`field ${resetSubmitted && resetErrors.resetTarget ? 'has-error' : ''}`}>
              <label>Apprentice</label>
              <select value={resetTarget} onChange={(e) => setResetTarget(e.target.value)}>
                <option value="">Select…</option>
                {apprentices.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {resetSubmitted && <FieldError message={resetErrors.resetTarget} />}
            </div>
            <div className={resetSubmitted && resetErrors.resetPin ? 'has-error' : ''}>
              <PinField label="New PIN" value={resetPin} onChange={setResetPin} />
              {resetSubmitted && <FieldError message={resetErrors.resetPin} />}
            </div>
            <div className={resetSubmitted && resetErrors.resetConfirm ? 'has-error' : ''}>
              <PinField label="Confirm new PIN" value={resetConfirm} onChange={setResetConfirm} />
              {resetSubmitted && <FieldError message={resetErrors.resetConfirm} />}
            </div>
            <button className="btn btn-secondary" disabled={resetSaving}>{resetSaving ? 'Saving…' : 'Reset PIN'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
