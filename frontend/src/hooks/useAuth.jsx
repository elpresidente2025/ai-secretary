import React, { useState, useEffect, createContext, useContext } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth(app);
  const db = getFirestore(app);

  const fetchUserProfile = async (uid) => {
    try {
      if (!uid) return null;
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn('fetchUserProfile failed:', e.message);
      return null;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const profile = await fetchUserProfile(currentUser.uid);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            emailVerified: currentUser.emailVerified,
            ...profile,
            _firebaseUser: currentUser,
          });
        } else {
          setUser(null);
        }
      } catch (e) {
        setError(e.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    await signOut(auth).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

