import { useCallback, useEffect, useState } from 'react'
import { fetchMessages, postMessage } from '../api/messages'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'

export default function DiscussionPanel({ threadType, referenceId }) {
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const loadMessages = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMessages(threadType, referenceId)
      setMessages(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load discussion'))
    } finally {
      setLoading(false)
    }
  }, [threadType, referenceId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSending(true)
    setError('')
    try {
      const created = await postMessage({
        thread_type: threadType,
        reference_id: referenceId,
        content: trimmed,
      })
      setMessages((prev) => [...prev, created])
      setContent('')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="discussion-panel">
      {loading ? (
        <p className="loading-state">Loading discussion…</p>
      ) : (
        <div className="discussion-thread">
          {messages.length === 0 ? (
            <p className="discussion-empty">No messages yet. Start the conversation below.</p>
          ) : (
            messages.map((msg) => (
              <article key={msg.id} className="discussion-message">
                <header className="discussion-message__header">
                  <strong>{msg.sender_name || `User #${msg.sender_id}`}</strong>
                  <time>{formatDateTime(msg.created_at)}</time>
                </header>
                <p className="discussion-message__body">{msg.content}</p>
              </article>
            ))
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <form className="discussion-compose" onSubmit={handleSend}>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a message…"
          maxLength={10000}
          disabled={sending}
        />
        <div className="discussion-compose__actions">
          <button
            type="submit"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            disabled={sending || !content.trim()}
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  )
}
