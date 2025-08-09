'use client'

import { useState } from 'react'

const faqs = [
  {
    id: 1,
    question: 'كيف استلم طلبي ؟',
    answer: 'يمكنك استلام طلبك عبر البريد الإلكتروني أو تحميله مباشرة من لوحة التحكم بعد اكتمال الطلب.',
  },
  {
    id: 2,
    question: 'هل التصميم الذي اريده خاص ؟',
    answer: 'نعم، يمكننا تصميم تصاميم خاصة ومخصصة حسب احتياجاتك ومتطلباتك.',
  },
  {
    id: 3,
    question: 'مدة التسليم الطلب ؟',
    answer: 'مدة التسليم تتراوح من 24 ساعة إلى 72 ساعة حسب نوع التصميم وتعقيده.',
  },
]

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (id: number) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  return (
    <section className="section faq-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">الأسئلة الشائعة</h2>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <div key={faq.id} className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(faq.id)}>
                <span>{faq.question}</span>
                <span className={`faq-arrow ${openFaq === faq.id ? 'open' : ''}`}>▼</span>
              </button>
              <div className={`faq-answer ${openFaq === faq.id ? 'open' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
