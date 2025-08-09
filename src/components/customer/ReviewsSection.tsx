'use client'

export default function ReviewsSection() {
  const reviews = [
    {
      id: 1,
      name: 'أحمد محمد',
      rating: 5,
      text: 'تصاميم رائعة وسرعة في التسليم، أنصح الجميع!',
      avatar: '👤',
    },
    {
      id: 2,
      name: 'سارة أحمد',
      rating: 5,
      text: 'خدمة ممتازة ودعم فني رائع، شكراً لكم',
      avatar: '👤',
    },
    {
      id: 3,
      name: 'محمد علي',
      rating: 4,
      text: 'تصاميم احترافية وأسعار معقولة',
      avatar: '👤',
    },
  ]

  return (
    <section className="section reviews-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">آراء العملاء</h2>
        </div>

        <div className="reviews-grid">
          {reviews.map((review) => (
            <div key={review.id} className="review-card card">
              <div className="review-header">
                <div className="review-avatar">{review.avatar}</div>
                <div className="review-info">
                  <h3 className="review-name">{review.name}</h3>
                  <div className="review-stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < review.rating ? 'star filled' : 'star'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="review-text">{review.text}</p>
              <button className="review-heart">❤️</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
