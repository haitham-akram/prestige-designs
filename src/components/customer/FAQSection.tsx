'use client'

import { useEffect, useState } from 'react'
import './FAQSection.css'

type FAQ = { _id?: string; question: string; answer: string }

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [faqs, setFaqs] = useState<FAQ[]>([])

  useEffect(() => {
    fetch('/api/faq')
      .then((r) => r.json())
      .then((res) => setFaqs(res?.data || []))
      .catch(() => setFaqs([]))
  }, [])

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  return (
    <div className="faq-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">الأسئلة الشائعة</h2>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <div key={faq._id} className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(faq._id!)}>
                <span>{faq.question}</span>
                <span className={`faq-arrow ${openFaq === faq._id ? 'open' : ''}`}>▼</span>
              </button>
              <div className={`faq-answer ${openFaq === faq._id ? 'open' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
