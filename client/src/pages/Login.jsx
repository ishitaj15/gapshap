import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:3001/api'

export default function Login({ onLogin, onGoSignup }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post(`${API}/auth/login`, { email, password })
      // Save tokens to localStorage
      localStorage.setItem('accessToken',  res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      localStorage.setItem('user',         JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">

        <h1 className="text-3xl font-bold text-purple-600 mb-2">GapShap 💬</h1>
        <p className="text-gray-500 mb-6">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
  <label className="block text-sm font-medium text-gray-700">
    Password
  </label>
  <span className="text-xs text-purple-600 hover:underline cursor-pointer">
    Forgot password?
  </span>
</div>
            <div className="relative">
  <input
    type={showPass ? 'text' : 'password'}
    value={password}
    onChange={e => setPassword(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-400"
    placeholder="••••••••"
    required
  />
  <button
    type="button"
    onClick={() => setShowPass(p => !p)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
  >
    {showPass ? '🙈' : '👁️'}
  </button>
</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
  Don't have an account?{' '}
  <a onClick={onGoSignup} className="text-purple-600 hover:underline font-medium cursor-pointer">
    Sign up
  </a>
</p>

      </div>
    </div>
  )
}