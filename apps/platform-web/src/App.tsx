import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from './store'
import AdminLoginPage from './pages/auth/AdminLogin'
import PrivateRoute from './router/PrivateRoute'
import PlatformLayout from './pages/platform/PlatformLayout'

const App: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      {/* SaaS管理后台登录页 */}
      <Route
        path="/login"
        element={
          isAuthenticated && user?.isPlatformAdmin ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AdminLoginPage />
          )
        }
      />

      {/* SaaS管理后台页面 */}
      <Route
        path="/*"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated} isPlatformAdmin={user?.isPlatformAdmin}>
            <PlatformLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
