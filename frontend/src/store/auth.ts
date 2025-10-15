import { create } from 'zustand'

interface AuthState {
  token: string | null
  role: 'admin' | 'agent' | 'landlord' | 'seeker' | null
  setCredentials: (token: string, role: AuthState['role']) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  setCredentials: (token, role) => set({ token, role }),
  clear: () => set({ token: null, role: null })
}))
