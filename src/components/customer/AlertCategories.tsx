'use client'

import Link from 'next/link'

const categories = [
  { id: 1, name: 'اليرتات البيسك', icon: '🎯', color: 'var(--neon-green)', slug: 'basic' },
  { id: 2, name: 'اليرتات مجانية', icon: '🎁', color: 'var(--neon-purple)', slug: 'free' },
  { id: 3, name: 'اليرتات التكبيس', icon: '🖱️', color: 'var(--neon-blue)', slug: 'click' },
  { id: 4, name: 'اليرتات عربية', icon: '🇸🇦', color: 'var(--neon-pink)', slug: 'arabic' },
  { id: 5, name: 'اليرتات الأندية', icon: '🏆', color: 'var(--neon-cyan)', slug: 'club' },
  { id: 6, name: 'اليرتات الاحتفالية', icon: '🎉', color: 'var(--neon-yellow)', slug: 'celebration' },
]

export default function AlertCategories() {
  return (
    <section className="section categories-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">اليرتات البريميوم</h2>
        </div>

        <div className="categories-grid">
          {categories.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="category-card card">
              <div className="category-icon" style={{ color: category.color }}>
                {category.icon}
              </div>
              <h3 className="category-name">{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
