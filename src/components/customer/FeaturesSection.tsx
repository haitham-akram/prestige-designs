'use client'

export default function FeaturesSection() {
  const features = [
    {
      id: 1,
      title: 'دعم فني',
      description: 'متواجدين 24 ساعة',
      icon: '💬',
      color: 'var(--neon-green)',
    },
    {
      id: 2,
      title: 'سرعة التنفيذ',
      description: 'تسليم الطلب خلال 24 ساعة',
      icon: '⚡',
      color: 'var(--neon-purple)',
    },
  ]

  return (
    <section className="section features-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">مميزاتنا</h2>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.id} className="feature-card card-neon">
              <div className="feature-icon" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
