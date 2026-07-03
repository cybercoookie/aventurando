import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useI18n } from '../lib/i18n.jsx'

// Floating button (visible on every page) that opens a small form for
// feedback or help requests. Works signed in or out; rows land in the
// `feedback` table, readable from the admin portal.
export default function FeedbackButton() {
  const { t } = useI18n()
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('feedback')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  function show() {
    setDone(false)
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      email: email.trim() || user?.email || null,
      kind,
      message: message.trim(),
      page: location.pathname,
    })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      setDone(true)
      setMessage('')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={t('feedbackTitle')}
        className="fixed bottom-16 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-xl text-white shadow-lg"
      >
        💬
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-teal-800">💬 {t('feedbackTitle')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            {done ? (
              <p className="mt-6 pb-4 text-center text-teal-700">{t('feedbackThanks')}</p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="flex gap-2">
                  {[
                    ['feedback', t('feedbackKind')],
                    ['help', t('helpKind')],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setKind(value)}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                        kind === value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('feedbackPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
                {!user && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('yourEmail')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || !message.trim()}
                  className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? t('sending') : t('send')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
