import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { User, signInWithCustomToken } from 'firebase/auth';
import { setStorageItem, removeStorageItem, getStorageItem, STORAGE_KEY } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        await setStorageItem(STORAGE_KEY, token);
      } else {
        await removeStorageItem();
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkToken = async () => {
      const token = await getStorageItem();
      if (token && !user) {
        signInWithCustomToken(auth, token).catch(async () => {
          await removeStorageItem();
        });
      }
    };
    checkToken();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
