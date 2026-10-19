import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isCreator: boolean;
  membership: 'free' | 'photo' | 'pro';
  avatar?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
