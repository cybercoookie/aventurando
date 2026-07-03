import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useWishlist } from '../hooks/useWishlist.js'
import WishlistButton from '../components/WishlistButton.jsx'
import ShareButton from '../components/ShareButton.jsx'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { useI18n } from '../lib/i18n.jsx'
import { openDirections, getCurrentPosition, distanceKm } from '../lib/geo.js'

export default function PlaceDetailPage() {
  const { slug } = useParams()
  const { t, lang, pick } = useI18n()
  const wishlist = useWishlist()
  const [place, setPlace] = useState(null)
  const [photos, setPhotos] = useState([])
  const [distance, setDistance] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => setPlace(data))
  }, [slug])

  useEffect(() => {
    if (!place) return
    supabase
      .from('place_photos')
      .select('*')
      .eq('place_id', place.id)
      .order('sort_order')
      .then(({ data }) => setPhotos(data ?? []))
  }, [place])

  useEffect(() => {
    if (!place) return
    getCurrentPosition()
      .then((pos) => setDistance(distanceKm(pos.lat, pos.lng, place.lat, place.lng)))
      .catch(() => {})
  }, [place])

  if (!place) return <div className="p-8 text-center text-slate-500">{t('loading')}</div>

  const cat = CATEGORIES[place.category] ?? CATEGORIES.landmark
  const hero = photos[0]
  const tips = pick(place, 'tips')

  const facts = [
    place.hours && ['🕑', t('hours'), place.hours],
    place.fees && ['🎟️', t('fees'), place.fees],
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link to="/" className="text-sm font-medium text-teal-600">
        ← {t('backToMap')}
      </Link>

      {hero ? (
        <button
          type="button"
          onClick={() => setLightbox(hero)}
          className="mt-3 block h-48 w-full overflow-hidden rounded-2xl"
        >
          <img src={hero.url} alt={place.name} className="h-full w-full object-cover" />
        </button>
      ) : (
        <div
          className="mt-3 flex h-40 items-center justify-center rounded-2xl text-6xl"
          style={{ background: `${cat.color}22` }}
        >
          {cat.emoji}
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{place.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cat.emoji} {categoryLabel(place.category, lang)} · {place.municipality}
            {distance != null && ` · ${distance.toFixed(1)} ${t('kmAway')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ShareButton place={place} />
          <WishlistButton placeId={place.id} wishlist={wishlist} />
        </div>
      </div>

      {place.difficulty && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{t('difficulty')}:</span> {t(place.difficulty)}
        </p>
      )}

      <p className="mt-3 leading-relaxed text-slate-700">{pick(place, 'description')}</p>

      {(facts.length > 0 || place.website) && (
        <div className="mt-4 space-y-1.5 rounded-2xl bg-white p-4 text-sm shadow-sm">
          {facts.map(([icon, label, value]) => (
            <p key={label}>
              {icon} <span className="font-semibold">{label}:</span> {value}
            </p>
          ))}
          {place.website && (
            <p>
              🔗{' '}
              <a
                href={place.website}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-teal-600 underline"
              >
                {t('website')}
              </a>
            </p>
          )}
        </div>
      )}

      {tips && (
        <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-relaxed text-orange-900">
          <span className="font-semibold">💡 {t('tips')}:</span> {tips}
        </div>
      )}

      {place.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {place.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-teal-100 px-3 py-1 text-xs text-teal-800">
              {tag}
            </span>
          ))}
        </div>
      )}

      {photos.length > 1 && (
        <>
          <h2 className="mt-6 text-lg font-bold text-teal-800">📷 {t('photos')}</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.slice(1).map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(photo)}
                className="aspect-square overflow-hidden rounded-xl"
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex gap-2 pb-4">
        <button
          type="button"
          onClick={async () => {
            let origin = null
            try {
              origin = await getCurrentPosition()
            } catch {
              // destination-only directions
            }
            openDirections(place, origin)
          }}
          className="flex-1 rounded-xl bg-teal-600 py-3 text-center font-semibold text-white"
        >
          🧭 {t('directions')}
        </button>
        <Link
          to={`/journal/new/${place.id}`}
          className="flex-1 rounded-xl bg-orange-500 py-3 text-center font-semibold text-white"
        >
          📓 {t('logVisit')}
        </Link>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt={place.name}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
          {lightbox.credit && (
            <p className="mt-2 text-center text-xs text-slate-300">{lightbox.credit}</p>
          )}
        </div>
      )}
    </div>
  )
}
