import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'

// Share a place link. Uses the native share sheet where available (mobile —
// covers WhatsApp, SMS, email, and everything else installed); otherwise
// shows a fallback menu with direct links.
export default function ShareButton({ place }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/place/${place.slug}`
  const text =
    lang === 'es'
      ? `Mira ${place.name} en ${place.municipality}, Puerto Rico`
      : `Check out ${place.name} in ${place.municipality}, Puerto Rico`

  async function handleClick() {
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text, url })
      } catch {
        // user dismissed the share sheet
      }
      return
    }
    setCopied(false)
    setOpen((v) => !v)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt(t('copyLink'), url)
    }
  }

  const encoded = encodeURIComponent(`${text} ${url}`)
  const options = [
    { label: 'WhatsApp', icon: '🟢', href: `https://wa.me/?text=${encoded}` },
    { label: t('textMessage'), icon: '💬', href: `sms:?&body=${encoded}` },
    {
      label: t('email'),
      icon: '✉️',
      href: `mailto:?subject=${encodeURIComponent(place.name)}&body=${encoded}`,
    },
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('share')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow"
      >
        📤
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-48 rounded-2xl bg-white p-2 shadow-xl">
          <p className="px-3 py-1 text-xs font-semibold uppercase text-slate-400">
            {t('shareVia')}
          </p>
          {options.map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>{opt.icon}</span> {opt.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>🔗</span> {copied ? t('linkCopied') : t('copyLink')}
          </button>
        </div>
      )}
    </div>
  )
}
