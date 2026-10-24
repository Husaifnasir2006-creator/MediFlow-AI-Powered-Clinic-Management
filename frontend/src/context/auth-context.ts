import { createContext } from 'react';
import { UserRole, UserProfile, Clinic } from '../types';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  clinic: Clinic | null;
  isLoading: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
