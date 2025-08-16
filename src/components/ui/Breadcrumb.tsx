'use client'

import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={index} className="breadcrumb-item-wrapper">
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          {item.href && !item.isActive ? (
            <Link href={item.href} className="breadcrumb-item">
              {item.label}
            </Link>
          ) : (
            <span className={`breadcrumb-item ${item.isActive ? 'active' : ''}`}>{item.label}</span>
          )}
        </div>
      ))}

      <style jsx>{`
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          font-size: 0.9rem;
          flex-wrap: wrap;
        }

        .breadcrumb-item-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .breadcrumb-item {
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.3s ease;
          white-space: nowrap;
        }

        .breadcrumb-item:hover {
          color: var(--color-primary);
        }

        .breadcrumb-item.active {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .breadcrumb-separator {
          color: var(--color-text-secondary);
        }

        @media (max-width: 768px) {
          .breadcrumb {
            font-size: 0.8rem;
            gap: 0.25rem;
          }
        }
      `}</style>
    </nav>
  )
}
