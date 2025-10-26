import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

interface AuthModalProps {
  onAuthSuccess: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const { signIn, signUp, resendVerificationEmail } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const result = await signIn(email, password)
        if (result.error) {
          setError(result.error.message)
        } else {
          onAuthSuccess()
        }
      } else {
        const result = await signUp(email, password)
        if (result.error) {
          setError(result.error.message)
        } else {
          // Show verification message
          setVerificationSent(true)
          setError(null)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setError(null)
    try {
      const result = await resendVerificationEmail(email)
      if (result.error) {
        setError(result.error.message)
      } else {
        setError('Verification email resent! Check your inbox.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResendLoading(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Check Your Email!</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification email to <strong>{email}</strong>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>

          {error && (
            <div className={`mb-4 px-4 py-3 rounded ${error.includes('resent') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {error}
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setVerificationSent(false)
                setIsLogin(true)
                setEmail('')
                setPassword('')
              }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Sign in to continue' : 'Start building with AI'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

