import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from './store'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './pages/auth/Login'
import PrivateRoute from './router/PrivateRoute'

const App: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          )
        }
      />

      {/* Tenant app routes - AI资产管理平台 */}
      <Route
        path="/*"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <MainLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
