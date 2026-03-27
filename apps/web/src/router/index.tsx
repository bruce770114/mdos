import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import PrivateRoute from './PrivateRoute'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

// Lazy-loaded pages
const DashboardPage = lazy(() => import('@/pages/dashboard/Dashboard'))
const UnitsPage = lazy(() => import('@/pages/units/Units'))
const CustomersPage = lazy(() => import('@/pages/customers/Customers'))
const ContractsPage = lazy(() => import('@/pages/contracts/Contracts'))
const BillingPage = lazy(() => import('@/pages/billing/Billing'))
const FinancialPage = lazy(() => import('@/pages/financial/Financial'))
const AssetMapPage = lazy(() => import('@/pages/asset-map/AssetMap'))
const PermissionsPage = lazy(() => import('@/pages/permissions/Permissions'))
const SettingsPage = lazy(() => import('@/pages/settings/Settings'))
const NotificationsPage = lazy(() => import('@/pages/notifications/Notifications'))
const LlmSettingsPage = lazy(() => import('@/pages/llm-models'))
const SubscriptionPage = lazy(() => import('@/pages/settings/Subscription'))

const PageFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '64px 0' }}>
    <Spin size="large" />
  </div>
)

const AppRouter: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/units"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <UnitsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <CustomersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <ContractsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <BillingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <FinancialPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/asset-map"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <AssetMapPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <PermissionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <NotificationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/llm-models"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <LlmSettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <SubscriptionPage />
            </PrivateRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRouter
