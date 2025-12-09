'use client'

import Link from 'next/link'

export default function CustomDesignSection() {
  return (
    <section className="section custom-design-section">
      <div className="container">
        <div className="custom-design-content">
          <div className="custom-design-text">
            <h2 className="section-title">ابدأ بثك بأسلوب يشبهك</h2>
            <p className="section-subtitle">تصميم الشعار والبكج صار عندنا !</p>
            <p className="custom-design-description">كل اللي عليك تختار اللي يناسبك ونسوي لك تصميم شعار وبكجك</p>
            <Link href="/custom-design" className="btn btn-primary btn-large">
              صمم بكجك
            </Link>
          </div>
          <div className="custom-design-visual">
            <div className="design-preview">
              <div className="crown-icon">👑</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
