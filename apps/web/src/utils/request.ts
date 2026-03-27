import axios, { AxiosError } from 'axios'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor ───────────────────────────────────────────────────
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// ─── Response interceptor ──────────────────────────────────────────────────
request.interceptors.response.use(
  (response) => {
    // Unwrap the ApiResponse envelope and return data.data directly
    return response.data
  },
  (error: AxiosError<{ code: number; message: string }>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data ?? error)
  }
)

export default request
