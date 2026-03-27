import React from 'react'
import { Navigate } from 'react-router-dom'

interface PrivateRouteProps {
  isAuthenticated: boolean
  isPlatformAdmin?: boolean
  children: React.ReactElement
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ isAuthenticated, isPlatformAdmin, children }) => {
  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  // 如果需要平台管理员权限但用户不是平台管理员，也重定向
  if (isPlatformAdmin !== undefined && !isPlatformAdmin) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default PrivateRoute
