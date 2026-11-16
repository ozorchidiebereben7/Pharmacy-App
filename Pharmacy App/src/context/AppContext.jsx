import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from '../db/engine';
import { seedIfEmpty } from '../db/seed';
import { verifyPin, hashPin, IDLE_TIMEOUT_MS } from '../lib/auth';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [engine, setEngine] = useState(null);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [reauthRequest, setReauthRequest] = useState(null);
  const idleTimer = useRef(null);
  const reauthResolver = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const e = await Engine.create();
      await seedIfEmpty(e);
      if (!cancelled) {
        setEngine(e);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!currentUser) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    resetIdleTimer();
    const events = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
    const handler = () => resetIdleTimer();
    events.forEach((ev) => window.addEventListener(ev, handler));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [currentUser, resetIdleTimer]);

  const listUsers = useCallback(() => {
    if (!engine) return [];
    return engine.all(`SELECT id, name, role FROM users WHERE active = 1 ORDER BY role DESC, name ASC`);
  }, [engine]);

  const login = useCallback(
    async (userId, pin) => {
      const user = engine.one(`SELECT * FROM users WHERE id = ?`, [userId]);
      if (!user) return { ok: false, error: 'User not found.' };
      const valid = await verifyPin(pin, user.pin_hash);
      if (!valid) return { ok: false, error: 'Incorrect PIN — try again' };
      setCurrentUser({ id: user.id, name: user.name, role: user.role });
      engine.logActivity({
        userId: user.id,
        action: 'LOGIN',
        tableAffected: 'users',
        before: null,
        after: { name: user.name, role: user.role },
        timestamp: new Date().toISOString(),
      });
      await engine.persist();
      return { ok: true };
    },
    [engine]
  );

  const refreshCurrentUser = useCallback(() => {
    if (!engine || !currentUser) return;
    const fresh = engine.one(`SELECT id, name, role, active FROM users WHERE id = ?`, [currentUser.id]);
    if (!fresh || fresh.active === 0) {
      setCurrentUser(null);
      return;
    }
    setCurrentUser({ id: fresh.id, name: fresh.name, role: fresh.role });
  }, [engine, currentUser]);

  const changePin = useCallback(
    async (userId, newPin) => {
      const hash = await hashPin(newPin);
      const target = engine.one(`SELECT name FROM users WHERE id = ?`, [userId]);
      await engine.transaction(async (e) => {
        e.run(`UPDATE users SET pin_hash = ? WHERE id = ?`, [hash, userId]);
        e.logActivity({
          userId: currentUser?.id || userId,
          action: 'STAFF',
          tableAffected: 'users',
          before: { name: target?.name, action: 'pin_change' },
          after: { name: target?.name, pin_updated: true },
          timestamp: new Date().toISOString(),
        });
      });
    },
    [engine, currentUser]
  );

  const requestReauth = useCallback(() => {
    return new Promise((resolve) => {
      reauthResolver.current = resolve;
      setReauthRequest({});
    });
  }, []);

  const submitReauth = useCallback(
    async (pin) => {
      const owners = engine.all(`SELECT * FROM users WHERE role = 'owner' AND active = 1`);
      for (const owner of owners) {
        if (await verifyPin(pin, owner.pin_hash)) {
          setReauthRequest(null);
          reauthResolver.current?.(true);
          reauthResolver.current = null;
          return true;
        }
      }
      return false;
    },
    [engine]
  );

  const cancelReauth = useCallback(() => {
    setReauthRequest(null);
    reauthResolver.current?.(false);
    reauthResolver.current = null;
  }, []);

  const value = useMemo(
    () => ({
      engine,
      ready,
      currentUser,
      listUsers,
      login,
      logout,
      changePin,
      refreshCurrentUser,
      requestReauth,
      reauthRequest,
      submitReauth,
      cancelReauth,
    }),
    [engine, ready, currentUser, listUsers, login, logout, changePin, refreshCurrentUser, requestReauth, reauthRequest, submitReauth, cancelReauth]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
