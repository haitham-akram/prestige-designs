'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import Image from 'next/image'

export default function AuthDebugPage() {
  const { data: session, status } = useSession()
  const [debugData, setDebugData] = useState(null)

  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/debug/session')
      const data = await response.json()
      setDebugData(data)
      console.log('Debug data:', data)
    } catch (error) {
      console.error('Error fetching debug data:', error)
    }
  }

  const handleGoogleLogin = async () => {
    console.log('🔍 Starting Google login...')
    await signIn('google', {
      callbackUrl: '/debug/auth',
      redirect: false,
    })
  }

  const handleTwitterLogin = async () => {
    console.log('🔍 Starting Twitter login...')
    await signIn('twitter', {
      callbackUrl: '/debug/auth',
      redirect: false,
    })
  }

  const handleDiscordLogin = async () => {
    console.log('🔍 Starting Discord login...')
    await signIn('discord', {
      callbackUrl: '/debug/auth',
      redirect: false,
    })
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Auth Debug Page</h1>

        {/* Session Status */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Session Status</h2>
          <p className="mb-2">
            <strong>Status:</strong> {status}
          </p>

          {session ? (
            <div className="space-y-2">
              <p>
                <strong>✅ Logged in as:</strong> {session.user?.email}
              </p>
              <p>
                <strong>Name:</strong> {session.user?.name || 'Not set'}
              </p>
              <p>
                <strong>Role:</strong> {session.user?.role || 'Not set'}
              </p>
              <p>
                <strong>ID:</strong> {session.user?.id || 'Not set'}
              </p>
              <p>
                <strong>Email Verified:</strong> {session.user?.isEmailVerified ? 'Yes' : 'No'}
              </p>
              <p>
                <strong>Image:</strong> {session.user?.image ? 'Yes' : 'No'}
              </p>
              {session.user?.image && (
                <div className="mt-2">
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-gray-300"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-600">❌ Not logged in</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Actions</h2>
          <div className="space-x-4 space-y-2 flex flex-wrap">
            {!session && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  🔴 Login with Google
                </button>
                <button
                  onClick={handleTwitterLogin}
                  className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500 transition-colors"
                >
                  🐦 Login with Twitter
                </button>
                <button
                  onClick={handleDiscordLogin}
                  className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
                >
                  🎮 Login with Discord
                </button>
                <button
                  onClick={() => signIn('credentials')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  📧 Login with Email
                </button>
              </>
            )}

            {session && (
              <button
                onClick={() => signOut()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                👋 Sign Out
              </button>
            )}

            <button
              onClick={fetchDebugData}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              🔍 Fetch Debug Data
            </button>
          </div>
        </div>

        {/* Provider Information */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">🔧 OAuth Provider Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-4 rounded">
              <h3 className="font-semibold text-green-600">✅ Google OAuth</h3>
              <p className="text-sm text-gray-600">Client ID configured</p>
              <p className="text-xs text-gray-500">Ready for testing</p>
            </div>
            <div className="border p-4 rounded">
              <h3 className="font-semibold text-blue-600">🐦 Twitter OAuth</h3>
              <p className="text-sm text-gray-600">Client ID configured</p>
              <p className="text-xs text-gray-500">Ready for testing</p>
            </div>
            <div className="border p-4 rounded">
              <h3 className="font-semibold text-gray-600">📧 Credentials</h3>
              <p className="text-sm text-gray-600">Email/Password login</p>
              <p className="text-xs text-gray-500">Always available</p>
            </div>
          </div>
        </div>

        {/* Debug Data */}
        {debugData && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">🔬 Debug Data</h2>
            <div className="space-y-4">
              {debugData.error && (
                <div className="p-4 bg-red-100 border border-red-300 rounded">
                  <strong className="text-red-700">Error:</strong> {debugData.error}
                </div>
              )}

              {debugData.session && (
                <div>
                  <h3 className="font-semibold mb-2">Session Data:</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugData.session, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.dbUser && (
                <div>
                  <h3 className="font-semibold mb-2">Database User:</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugData.dbUser, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.comparison && (
                <div>
                  <h3 className="font-semibold mb-2">Comparison:</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugData.comparison, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Session Data */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📋 Raw Session Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify({ session, status }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
