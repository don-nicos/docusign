import { AuthSession, User } from '@/types'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

export const authStorage = {
  setSession(session: AuthSession): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userJson = localStorage.getItem(USER_KEY)
    if (!userJson) return null
    
    try {
      return JSON.parse(userJson)
    } catch {
      return null
    }
  },

  clearSession(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },
}
