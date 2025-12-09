'use client'

export default function StoreStats() {
  const stats = [
    {
      id: 1,
      label: 'مبيعات المتجر',
      value: '+26',
      subtitle: 'العملاء',
      icon: '📈',
      color: 'var(--neon-green)',
    },
    {
      id: 2,
      label: 'الاقسام',
      value: '+32',
      subtitle: 'طلبات التصميم',
      icon: '🎨',
      color: 'var(--neon-purple)',
    },
  ]

  return (
    <section className="section stats-section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.id} className="stat-card card-neon">
              <div className="stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{stat.label}</h3>
                <div className="stat-value" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <p className="stat-subtitle">{stat.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
