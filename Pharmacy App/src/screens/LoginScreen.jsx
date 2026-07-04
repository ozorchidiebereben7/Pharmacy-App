import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { listUsers, login } = useApp();
  const navigate = useNavigate();
  const users = listUsers();
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setSelectedUser(null);
    setPin('');
    setError('');
  };

  const submit = async (fullPin) => {
    setBusy(true);
    const result = await login(selectedUser.id, fullPin);
    setBusy(false);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setPin('');
      setTimeout(() => setError(''), 500);
    }
  };

  const handleDigit = (d) => {
    if (pin.length >= 4 || busy) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  if (!selectedUser) {
    return (
      <div className="screen">
        <div className="screen-body stack">
          <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
            <h1 className="font-display" style={{ fontSize: 'var(--fs-hero)', margin: 0, color: 'var(--color-primary)' }}>
              Pharmacy App
            </h1>
            <p style={{ color: 'var(--color-sub)', margin: '8px 0 0' }}>Select your name to sign in</p>
          </div>
          <div className="grid-2">
            {users.map((u) => (
              <button key={u.id} className="user-tile" onClick={() => setSelectedUser(u)}>
                <span className="avatar">{u.name.charAt(0)}</span>
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                <span className="pill pill-neutral">{u.role}</span>
              </button>
            ))}
          </div>
          {users.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-sub)' }}>Loading users…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-body stack">
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <span className="avatar" style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-tint)', color: 'var(--color-primary)', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {selectedUser.name.charAt(0)}
          </span>
          <h2 style={{ margin: '12px 0 0' }}>{selectedUser.name}</h2>
          <p style={{ color: 'var(--color-sub)', margin: '4px 0 0' }}>Enter 4-digit PIN</p>
        </div>
        <div className="keypad-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`keypad-dot ${pin.length > i ? 'filled' : ''}`} />
          ))}
        </div>
        <div style={{ minHeight: 20, textAlign: 'center' }}>
          {error && <span className="field-error" role="alert" style={{ justifyContent: 'center' }}>{error}</span>}
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="keypad-key" disabled={busy} onClick={() => handleDigit(d)}>
              {d}
            </button>
          ))}
          <button className="keypad-key" disabled={busy} onClick={reset}>
            Cancel
          </button>
          <button className="keypad-key" disabled={busy} onClick={() => handleDigit('0')}>
            0
          </button>
          <button className="keypad-key" disabled={busy} onClick={() => setPin(pin.slice(0, -1))}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
