import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitSupportTicket } from '../api/support'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

const FAQ_ITEMS = [
  {
    question: 'How do I reset my password?',
    answer:
      'Go to Settings or the login page and click "Forgot password?" Enter your email to receive a secure reset link.',
  },
  {
    question: 'How are vendors approved?',
    answer:
      'New vendor profiles start as Pending. Procurement Managers or Administrators review the profile and move it through Under Review to Approved or Rejected.',
  },
  {
    question: 'Who can create purchase orders?',
    answer:
      'Only Procurement Managers can create purchase orders from approved procurement requests.',
  },
  {
    question: 'How do contract expiry alerts work?',
    answer:
      'VendorIQ monitors contract expiry dates and creates notifications when a contract enters the Expiring Soon window (90, 60, or 30 days remaining).',
  },
  {
    question: 'How do I contact support?',
    answer:
      'Use the contact form below to submit a support ticket. Our team will respond to the email on your account.',
  },
]

export default function HelpSupport() {
  const { user } = useAuth()
  const [openIndex, setOpenIndex] = useState(0)
  const [name, setName] = useState(user?.name ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const ticket = await submitSupportTicket({
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      setSuccess(`Support ticket #${ticket.id} submitted. We will respond to ${ticket.email}.`)
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit support request'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Help &amp; Support</h1>
          <p>Find answers or contact the VendorIQ support team.</p>
        </div>
      </header>

      <section className="list-card help-card">
        <div className="list-card__header">
          <h3>Frequently Asked Questions</h3>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div key={item.question} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="faq-item__question"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  {item.question}
                  <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="faq-item__answer">{item.answer}</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="list-card help-card">
        <div className="list-card__header">
          <h3>Contact Support</h3>
          <span className="list-card__meta">Submit a ticket and we&apos;ll get back to you</span>
        </div>

        <form className="auth-form help-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input type="email" value={user?.email ?? ''} disabled />
          </label>

          <label>
            Subject
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={255}
            />
          </label>

          <label>
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={5}
              maxLength={5000}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </form>
      </section>
    </section>
  )
}
