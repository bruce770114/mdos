import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User } from '@/types'
import i18n from '@/i18n'

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
}

// Restore language preference from stored user on app load
const storedUser: User | null = JSON.parse(localStorage.getItem('user') || 'null')
if (storedUser?.language && storedUser.language !== i18n.language?.split('-')[0]) {
  i18n.changeLanguage(storedUser.language)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) {
      state.user = action.payload.user
      state.token = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      localStorage.setItem('accessToken', action.payload.accessToken)
      localStorage.setItem('refreshToken', action.payload.refreshToken)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
      // Sync interface language with user preference
      if (action.payload.user.language) {
        i18n.changeLanguage(action.payload.user.language)
      }
    },
    logout(state) {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
