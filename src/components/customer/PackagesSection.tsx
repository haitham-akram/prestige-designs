'use client'

import Link from 'next/link'

interface Package {
  id: string
  name: string
  description: string
  originalPrice: number
  discountedPrice: number
  features: string[]
  icon: string
  color: string
}

const packages: Package[] = [
  {
    id: '1',
    name: 'بكج اليرتات السعودية',
    description: 'مجموعة متنوعة من اليرتات السعودية الاحترافية',
    originalPrice: 299,
    discountedPrice: 199,
    features: ['20 يرت مختلف', 'ألوان متعددة', 'دعم فني', 'تحديثات مجانية'],
    icon: '🎯',
    color: 'var(--neon-green)',
  },
  {
    id: '2',
    name: 'بكج اليرتات الدومينيشن',
    description: 'يرتات قوية ومؤثرة للستريمرز المحترفين',
    originalPrice: 399,
    discountedPrice: 249,
    features: ['30 يرت مختلف', 'ألوان متعددة', 'دعم فني', 'تحديثات مجانية', 'تصميم مخصص'],
    icon: '⚡',
    color: 'var(--neon-purple)',
  },
  {
    id: '3',
    name: 'بكج اليرتات احتفالي',
    description: 'يرتات احتفالية مميزة للمناسبات الخاصة',
    originalPrice: 199,
    discountedPrice: 149,
    features: ['15 يرت مختلف', 'ألوان متعددة', 'دعم فني', 'تحديثات مجانية'],
    icon: '🎉',
    color: 'var(--neon-pink)',
  },
]

export default function PackagesSection() {
  return (
    <section className="section packages-section">
      <div className="container">
        <div className="section-header">
          <div>
            <h2 className="section-title">بكجات</h2>
            <p className="section-subtitle">بأسعار توفيرية !</p>
          </div>
        </div>

        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className="package-card card-neon">
              <div className="package-header">
                <div className="package-icon" style={{ backgroundColor: pkg.color }}>
                  {pkg.icon}
                </div>
                <h3 className="package-name">{pkg.name}</h3>
                <p className="package-description">{pkg.description}</p>
              </div>

              <div className="package-features">
                <ul>
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="feature-item">
                      <span className="feature-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="package-pricing">
                <div className="price-container">
                  <span className="original-price">{pkg.originalPrice} ريال</span>
                  <span className="discounted-price">{pkg.discountedPrice} ريال</span>
                </div>
                <div className="discount-badge">
                  {Math.round(((pkg.originalPrice - pkg.discountedPrice) / pkg.originalPrice) * 100)}% خصم
                </div>
              </div>

              <div className="package-actions">
                <Link href={`/package/${pkg.id}`} className="btn btn-primary">
                  عرض التفاصيل
                </Link>
                <div className="action-buttons">
                  <button className="action-btn add-to-cart" title="إضافة للسلة">
                    🛒
                  </button>
                  <button className="action-btn add-to-favorites" title="إضافة للمفضلة">
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="packages-cta">
          <Link href="/packages" className="btn btn-secondary btn-large">
            عرض جميع البكجات
          </Link>
        </div>
      </div>
    </section>
  )
}
