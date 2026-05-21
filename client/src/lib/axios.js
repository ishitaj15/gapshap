import axios from 'axios'

const API = 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API,
})

// ─── Request interceptor ──────────────────────────────────
// Automatically attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor ─────────────────────────────────
// If we get a 403, try to refresh the token silently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // If 403 and we haven't retried yet
    if (error.response?.status === 403 && !original._retry) {
      original._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const res = await axios.post(`${API}/auth/refresh`, { refreshToken })

        const newToken = res.data.accessToken
        localStorage.setItem('accessToken', newToken)

        // Retry the original request with new token
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)

      } catch {
        // Refresh failed — force logout
        localStorage.clear()
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

export default api