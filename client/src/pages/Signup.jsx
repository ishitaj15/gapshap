import { useState } from 'react'
import api from '../lib/axios'


const requirements = [
  { label: 'At least 8 characters',     test: p => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
  { label: 'One number (0-9)',           test: p => /[0-9]/.test(p) },
  { label: 'One special character (!@#$)', test: p => /[!@#$%^&*]/.test(p) },
]

export default function Signup({ onSignup }) {
  const [username,    setUsername]    = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const allValid = requirements.every(r => r.test(password))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!allValid) {
      setError('Password does not meet all requirements')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/signup', { username, email, password })
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('accessToken',  res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      localStorage.setItem('user',         JSON.stringify(res.data.user))
      onSignup(res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">

        <h1 className="text-3xl font-bold text-purple-600 mb-2">GapShap 💬</h1>
        <p className="text-gray-500 mb-6">Create your account</p>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="ishita"
              required
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
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

            {/* Password requirements */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {requirements.map((r, i) => (
                  <li key={i} className={`text-xs flex items-center gap-1
                    ${r.test(password) ? 'text-green-600' : 'text-red-400'}`}
                  >
                    {r.test(password) ? '✅' : '❌'} {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allValid}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <a href="/" className="text-purple-600 hover:underline font-medium">
            Sign in
          </a>
        </p>

      </div>
    </div>
  )
}