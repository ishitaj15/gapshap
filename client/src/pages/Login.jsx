import { useState } from 'react'
import api from '../lib/axios'

export default function Login({ onLogin, onGoSignup }) {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showPass,  setShowPass]  = useState(false)
  const [forgotMsg, setForgotMsg] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
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
    <div className="min-h-screen flex">

      {/* ── Left panel ───────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1a1f5e] to-[#2d3494] flex-col items-center justify-center p-12 text-white">
        <div className="bg-white rounded-full p-5 mb-6 shadow-2xl">
          <img
            src="/assets/logo.png"
            alt="GapShap"
            className="w-32 h-32 object-contain rounded-full"
          />
        </div>
        <h1 className="text-4xl font-bold mb-3 text-center text-white">GapShap</h1>
        <p className="text-lg text-blue-200 mb-2 text-center italic">
          Baaten Jo Jodein
        </p>
        <p className="text-blue-300 text-sm text-center mt-4 max-w-xs leading-relaxed">
          Real-time chat powered by a custom C++ engine. Fast, secure, and built for scale.
        </p>
        <div className="mt-10 space-y-3 w-full max-w-xs">
          {[
            { icon: '⚡', text: 'Real-time messaging via C++ epoll' },
            { icon: '🔒', text: 'JWT auth with refresh tokens' },
            { icon: '🌐', text: 'Online/offline status' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm text-blue-100">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/assets/logo.png" alt="GapShap" className="w-24" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your GapShap account</p>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2d3494] text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <span
                  onClick={() => setForgotMsg(true)}
                  className="text-xs text-[#2d3494] hover:underline cursor-pointer"
                >
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#2d3494] text-sm"
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
              className="w-full bg-[#1a1f5e] text-white py-3 rounded-lg font-medium hover:bg-[#2d3494] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <button
              onClick={onGoSignup}
              className="text-[#2d3494] hover:underline font-medium"
            >
              Sign up
            </button>
          </p>

        </div>
      </div>

      {/* Forgot password popup */}
      {forgotMsg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-xl">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Coming Soon</h3>
            <p className="text-gray-500 text-sm mb-6">
              Password reset is not available yet. Please contact support for help.
            </p>
            <button
              onClick={() => setForgotMsg(false)}
              className="bg-[#1a1f5e] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#2d3494]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  )
}