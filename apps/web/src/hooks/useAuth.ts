import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { logout } from '@/store/slices/authSlice'

/**
 * Custom hook for accessing authentication state and actions.
 *
 * Returns the currently authenticated user object, a boolean flag indicating
 * whether a user is authenticated, and a `logout` callback that dispatches
 * the logout action to the Redux store.
 */
export function useAuth() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()

  return {
    user,
    isAuthenticated,
    logout: () => dispatch(logout()),
  }
}
