import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Clinic } from '../types';
import { api } from '../services/api';
import { AuthContext } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => api.getDemoRole());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    api.switchDemoRole(role)
      .then(res => {
        if (ignore) return;
        api.setToken(res.token);
        setUser(res.user);
        return api.getMe();
      })
      .then(meRes => {
        if (ignore || !meRes) return;
        if (meRes.clinic) setClinic(meRes.clinic);
      })
      .catch(err => {
        if (!ignore) console.error('Failed to load profile for role:', role, err);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [role]);

  const switchRole = async (newRole: UserRole) => {
    setIsLoading(true);
    setRole(newRole);
  };

  return (
    <AuthContext.Provider value={{ user, role, clinic, isLoading, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};
