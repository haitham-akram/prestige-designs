'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CustomerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only perform redirects after hydration to avoid mismatch
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Redirect admin users to admin dashboard
    if (session?.user?.role === 'admin') {
      router.push('/admin/dashboard')
      return
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <div>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/auth/signin',
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: '700',
                background: 'var(--gradient-primary)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem',
              }}
            >
              Welcome to Prestige Designs!
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Customer Dashboard</p>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Sign Out
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: 'var(--accent-primary)',
            }}
          >
            Your Profile
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong>Name:</strong> {session.user?.name || 'Not provided'}
            </div>
            <div>
              <strong>Email:</strong> {session.user?.email || 'Not provided'}
            </div>
            <div>
              <strong>Role:</strong>
              <span
                style={{
                  background: 'var(--accent-success)',
                  color: 'var(--bg-primary)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  marginLeft: '0.5rem',
                  textTransform: 'capitalize',
                  fontWeight: '600',
                }}
              >
                {session.user?.role || 'customer'}
              </span>
            </div>
            <div>
              <strong>Email Verified:</strong>
              <span
                style={{
                  color: session.user?.isEmailVerified ? 'var(--accent-success)' : '#f87171',
                }}
              >
                {session.user?.isEmailVerified ? ' ✓ Verified' : ' ✗ Not verified'}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/')}
          >
            <h3
              style={{
                color: 'var(--accent-primary)',
                marginBottom: '0.5rem',
              }}
            >
              🛍️ Browse Store
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Explore our premium designs
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/customer/orders')}
          >
            <h3
              style={{
                color: 'var(--accent-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              📦 My Orders
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              View your purchase history
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/customer/orders')}
          >
            <h3
              style={{
                color: 'var(--accent-success)',
                marginBottom: '0.5rem',
              }}
            >
              💎 Downloads
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Access your purchased designs
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
