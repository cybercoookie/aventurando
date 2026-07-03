import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { usePlaces } from '../hooks/usePlaces.js'
import { useWishlist } from '../hooks/useWishlist.js'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { useI18n } from '../lib/i18n.jsx'

function StatTile({ value, label }) {
  return (
    <div className="flex-1 rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-2xl font-bold text-teal-700">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  )
}

function PlaceRow({ place, subtitle }) {
  const cat = CATEGORIES[place.category] ?? CATEGORIES.landmark
  return (
    <Link
      to={`/place/${place.slug}`}
      className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ background: `${cat.color}22` }}
      >
        {cat.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{place.name}</span>
        <span className="block text-sm text-slate-500">{subtitle}</span>
      </span>
    </Link>
  )
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { t, lang } = useI18n()
  const { places, loading: placesLoading } = usePlaces()
  const wishlist = useWishlist()
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    supabase
      .from('journal_entries')
      .select('*, place:places(name, slug, category, municipality)')
      .order('visited_on', { ascending: false })
      .then(({ data }) => setEntries(data ?? []))
  }, [])

  if (!entries || placesLoading || wishlist.loading)
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>

  const visitedPlaceIds = new Set(entries.map((e) => e.place_id))
  const savedPlaces = places.filter((p) => wishlist.ids.has(p.id))
  const dateFormat = { year: 'numeric', month: 'short', day: 'numeric' }
  const locale = lang === 'es' ? 'es-PR' : 'en-US'

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold text-teal-800">📊 {t('dashboard')}</h1>
      <p className="mt-1 truncate text-sm text-slate-500">
        {profile?.display_name || user.email}
      </p>

      <div className="mt-4 flex gap-3">
        <StatTile value={visitedPlaceIds.size} label={t('placesVisited')} />
        <StatTile value={entries.length} label={t('visitsLogged')} />
        <StatTile value={savedPlaces.length} label={t('onWishlist')} />
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-teal-800">🥾 {t('visitedHistory')}</h2>
        <Link to="/journal" className="text-sm font-medium text-teal-600">
          {t('seeAll')} →
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">{t('emptyVisited')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.slice(0, 10).map((entry) => (
            <li key={entry.id}>
              <PlaceRow
                place={{ ...entry.place, category: entry.place?.category }}
                subtitle={
                  new Date(entry.visited_on + 'T12:00:00').toLocaleDateString(
                    locale,
                    dateFormat,
                  ) + (entry.rating ? ` · ${'⭐'.repeat(entry.rating)}` : '')
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-teal-800">❤️ {t('wishlist')}</h2>
        <Link to="/wishlist" className="text-sm font-medium text-teal-600">
          {t('seeAll')} →
        </Link>
      </div>
      {savedPlaces.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">{t('emptyWishlist')}</p>
      ) : (
        <ul className="mt-3 space-y-3 pb-4">
          {savedPlaces.slice(0, 10).map((place) => (
            <li key={place.id}>
              <PlaceRow
                place={place}
                subtitle={`${categoryLabel(place.category, lang)} · ${place.municipality}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
