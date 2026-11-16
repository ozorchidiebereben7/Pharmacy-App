import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { FieldError } from '../components/FieldError';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { listAllStaff, createStaff, updateStaff, setStaffActive, resetStaffPin } from '../lib/staffEngine';
import { formatDate, formatMoney } from '../lib/format';

function StaffMemberCard({ member, currentUser, onChanged }) {
  const { engine, requestReauth, refreshCurrentUser } = useApp();
  const [mode, setMode] = useState(null); // 'edit' | 'pin' | null
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const isSelf = member.id === currentUser.id;
  const isActive = member.active === 1;
  const joinedDate = member.created_at ? member.created_at.slice(0, 10) : '';

  const openEdit = () => {
    setName(member.name);
    setRole(member.role);
    setError('');
    setFeedback('');
    setMode(mode === 'edit' ? null : 'edit');
  };

  const openPin = () => {
    setNewPin('');
    setConfirmPin('');
    setError('');
    setFeedback('');
    setMode(mode === 'pin' ? null : 'pin');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setBusy(true);
    try {
      await updateStaff(engine, {
        staffId: member.id,
        name: name.trim(),
        role,
        actorId: currentUser.id,
      });
      if (isSelf) refreshCurrentUser();
      setMode(null);
      setFeedback('Staff details updated.');
      onChanged();
    } catch (err) {
      setError(err.message || 'Could not update staff details.');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    if (newPin.length !== 4) {
      setError('New PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setBusy(true);
    try {
      await resetStaffPin(engine, {
        staffId: member.id,
        newPin,
        actorId: currentUser.id,
      });
      setMode(null);
      setFeedback(`PIN updated for ${member.name}.`);
      onChanged();
    } catch (err) {
      setError(err.message || 'Could not reset PIN.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (targetActive) => {
    setError('');
    setFeedback('');
    const confirmed = await requestReauth();
    if (!confirmed) {
      setConfirmDeactivate(false);
      return;
    }
    setBusy(true);
    try {
      await setStaffActive(engine, {
        staffId: member.id,
        active: targetActive,
        actorId: currentUser.id,
      });
      setConfirmDeactivate(false);
      setFeedback(targetActive ? `${member.name} reactivated.` : `${member.name} deactivated.`);
      onChanged();
    } catch (err) {
      setConfirmDeactivate(false);
      setError(err.message || 'Could not update account status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack-sm" style={{ opacity: isActive ? 1 : 0.72 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Avatar name={member.name} size={44} />
          <div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-body)' }}>{member.name}</span>
              <span className={`pill ${member.role === 'owner' ? 'pill-ok' : 'pill-neutral'}`}>
                {member.role}
              </span>
              {isSelf && <span className="pill pill-ok">You</span>}
              {!isActive && <span className="pill pill-danger">Inactive</span>}
            </div>
            <div className="tabular" style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)', marginTop: 2 }}>
              {member.salesCount} sale{member.salesCount === 1 ? '' : 's'} · {formatMoney(member.totalRevenue)}
            </div>
            {joinedDate && (
              <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--color-faint)' }}>
                Added {formatDate(joinedDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-2) var(--space-3)' }}>
          {feedback}
        </div>
      )}
      {error && <FieldError message={error} />}

      <div className="chip-row" style={{ marginTop: 4 }}>
        <button type="button" className={`btn btn-secondary btn-sm`} onClick={openEdit} disabled={busy}>
          {mode === 'edit' ? 'Close edit' : 'Edit details'}
        </button>
        <button type="button" className={`btn btn-secondary btn-sm`} onClick={openPin} disabled={busy}>
          {mode === 'pin' ? 'Close PIN' : 'Reset PIN'}
        </button>
        {isActive ? (
          !isSelf && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => setConfirmDeactivate(true)}
              disabled={busy}
            >
              Deactivate
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleToggleActive(true)}
            disabled={busy}
          >
            Reactivate
          </button>
        )}
      </div>

      {mode === 'edit' && (
        <form className="stack-sm" onSubmit={handleSaveEdit} style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-line)' }}>
          <div className="field">
            <label>Staff name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" />
          </div>
          <div className="field">
            <label>Role</label>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${role === 'apprentice' ? 'active' : ''}`}
                onClick={() => setRole('apprentice')}
              >
                Apprentice
              </button>
              <button
                type="button"
                className={`chip ${role === 'owner' ? 'active' : ''}`}
                onClick={() => setRole('owner')}
              >
                Owner
              </button>
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'pin' && (
        <form className="stack-sm" onSubmit={handleSavePin} style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-line)' }}>
          <div className="grid-2">
            <div className="field">
              <label>New 4-digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="field">
              <label>Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Saving…' : 'Update PIN'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          title={`Deactivate ${member.name}?`}
          message={`${member.name} will no longer appear on the sign-in screen, but all past sales and activity records will remain intact. You can reactivate this account anytime.`}
          confirmLabel="Deactivate account"
          danger
          busy={busy}
          onConfirm={() => handleToggleActive(false)}
          onCancel={() => setConfirmDeactivate(false)}
        />
      )}
    </div>
  );
}

function AddStaffTab({ onCreated }) {
  const { engine, currentUser, requestReauth } = useApp();
  const [name, setName] = useState('');
  const [role, setRole] = useState('apprentice');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const errors = {
    name: !name.trim() ? 'Enter the staff member’s name.' : '',
    pin: pin.length !== 4 ? 'Enter a 4-digit PIN.' : '',
    confirmPin: confirmPin !== pin ? 'PINs do not match.' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    setSuccess('');
    if (hasErrors) return;

    const confirmed = await requestReauth();
    if (!confirmed) return;

    setSaving(true);
    try {
      const created = await createStaff(engine, {
        name: name.trim(),
        role,
        pin,
        actorId: currentUser.id,
      });
      setSuccess(`Added ${created.name} (${created.role}). They can now sign in from the login screen.`);
      setName('');
      setRole('apprentice');
      setPin('');
      setConfirmPin('');
      setSubmitted(false);
      onCreated();
    } catch (err) {
      setServerError(err.message || 'Could not create staff member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 style={{ margin: 0 }}>New staff account</h2>
      {success && (
        <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-3)' }}>
          {success}
        </div>
      )}
      {serverError && <FieldError message={serverError} />}

      <div className={`field ${submitted && errors.name ? 'has-error' : ''}`}>
        <label>Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chinedu (Apprentice)"
        />
        {submitted && <FieldError message={errors.name} />}
      </div>

      <div className="field">
        <label>Role</label>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${role === 'apprentice' ? 'active' : ''}`}
            onClick={() => setRole('apprentice')}
          >
            Apprentice
          </button>
          <button
            type="button"
            className={`chip ${role === 'owner' ? 'active' : ''}`}
            onClick={() => setRole('owner')}
          >
            Owner
          </button>
        </div>
        <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>
          {role === 'apprentice'
            ? 'Can record sales, view stock, and view their own sales for the day.'
            : 'Full access to revenue, profit, stock adjustments, price edits, end-of-day close-out, and staff management.'}
        </span>
      </div>

      <div className="grid-2">
        <div className={`field ${submitted && errors.pin ? 'has-error' : ''}`}>
          <label>4-digit PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
          />
          {submitted && <FieldError message={errors.pin} />}
        </div>
        <div className={`field ${submitted && errors.confirmPin ? 'has-error' : ''}`}>
          <label>Confirm 4-digit PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
          />
          {submitted && <FieldError message={errors.confirmPin} />}
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-cta" disabled={saving}>
        {saving ? 'Creating…' : 'Create Staff Account'}
      </button>
    </form>
  );
}

export default function StaffScreen() {
  const { engine, currentUser } = useApp();
  const [tab, setTab] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTick, setRefreshTick] = useState(0);

  const staff = useMemo(() => listAllStaff(engine), [engine, refreshTick]);
  const activeCount = staff.filter((s) => s.active === 1).length;
  const inactiveCount = staff.filter((s) => s.active === 0).length;

  const filtered = useMemo(() => {
    if (statusFilter === 'active') return staff.filter((s) => s.active === 1);
    if (statusFilter === 'inactive') return staff.filter((s) => s.active === 0);
    return staff;
  }, [staff, statusFilter]);

  return (
    <div className="screen">
      <TopBar title="Staff & Users" />
      <div className="screen-body stack">
        <div className="chip-row">
          <button className={`chip ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
            Staff Members ({activeCount})
          </button>
          <button className={`chip ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
            + Add Staff
          </button>
        </div>

        {tab === 'add' ? (
          <AddStaffTab
            onCreated={() => {
              setRefreshTick((t) => t + 1);
            }}
          />
        ) : (
          <>
            {inactiveCount > 0 && (
              <div className="chip-row">
                <button
                  className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({staff.length})
                </button>
                <button
                  className={`chip ${statusFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active ({activeCount})
                </button>
                <button
                  className={`chip ${statusFilter === 'inactive' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('inactive')}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No staff members found"
                message="Add a new staff member or change your status filter."
              />
            ) : (
              <div className="stack-sm">
                {filtered.map((member) => (
                  <StaffMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    onChanged={() => setRefreshTick((t) => t + 1)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
