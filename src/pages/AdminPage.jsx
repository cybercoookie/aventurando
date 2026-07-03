import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { CATEGORIES, categoryLabel } from '../lib/categories.js'
import { useI18n } from '../lib/i18n.jsx'

const EMPTY_PLACE = {
  name: '',
  slug: '',
  category: 'hike',
  municipality: '',
  lat: '',
  lng: '',
  difficulty: '',
  description_en: '',
  description_es: '',
  tags: '',
  website: '',
  hours: '',
  fees: '',
  tips_en: '',
  tips_es: '',
}

async function fetchAllPlaces() {
  const { data } = await supabase.from('places').select('*').order('name')
  return data ?? []
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toForm(place) {
  return {
    ...EMPTY_PLACE,
    ...Object.fromEntries(
      Object.entries(place).map(([k, v]) => [k, v ?? '']),
    ),
    tags: (place.tags ?? []).join(', '),
  }
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm'

async function fetchPhotos(placeId) {
  const { data } = await supabase
    .from('place_photos')
    .select('*')
    .eq('place_id', placeId)
    .order('sort_order')
  return data ?? []
}

function PlacePhotos({ placeId }) {
  const { t } = useI18n()
  const [photos, setPhotos] = useState([])
  const [url, setUrl] = useState('')
  const [credit, setCredit] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPhotos(placeId).then((data) => {
      if (!cancelled) setPhotos(data)
    })
    return () => {
      cancelled = true
    }
  }, [placeId])

  async function load() {
    setPhotos(await fetchPhotos(placeId))
  }

  async function addPhoto(e) {
    e.preventDefault()
    setError(null)
    const { error: insertError } = await supabase.from('place_photos').insert({
      place_id: placeId,
      url: url.trim(),
      credit: credit.trim() || null,
      sort_order: photos.length,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setUrl('')
    setCredit('')
    load()
  }

  async function removePhoto(id) {
    await supabase.from('place_photos').delete().eq('id', id)
    load()
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-bold text-teal-800">📷 {t('photos')}</h3>
      <ul className="mt-2 space-y-2">
        {photos.map((photo) => (
          <li key={photo.id} className="flex items-center gap-2">
            <img src={photo.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-slate-600">{photo.url}</span>
              {photo.credit && (
                <span className="block truncate text-xs text-slate-400">{photo.credit}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600"
            >
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addPhoto} className="mt-2 space-y-2">
        <input
          type="url"
          required
          pattern="https://.*"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('photoUrl')}
          className={inputCls}
        />
        <input
          type="text"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
          placeholder={t('photoCredit')}
          className={inputCls}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {t('addPhoto')}
        </button>
      </form>
    </div>
  )
}

function PlaceEditor({ place, onDone }) {
  const { t } = useI18n()
  const isNew = !place
  const [form, setForm] = useState(isNew ? EMPTY_PLACE : toForm(place))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const row = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      category: form.category,
      municipality: form.municipality.trim(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      difficulty: form.difficulty || null,
      description_en: form.description_en,
      description_es: form.description_es,
      tags: form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      website: form.website.trim() || null,
      hours: form.hours.trim() || null,
      fees: form.fees.trim() || null,
      tips_en: form.tips_en,
      tips_es: form.tips_es,
    }
    const query = isNew
      ? supabase.from('places').insert(row)
      : supabase.from('places').update(row).eq('id', place.id)
    const { error } = await query
    setBusy(false)
    if (error) setStatus({ kind: 'error', text: error.message })
    else {
      setStatus({ kind: 'ok', text: t('saved') })
      onDone(true)
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('confirmDeletePlace'))) return
    setBusy(true)
    const { error } = await supabase.from('places').delete().eq('id', place.id)
    setBusy(false)
    if (error) {
      const text = error.code === '23503' ? t('deletePlaceBlocked') : error.message
      setStatus({ kind: 'error', text })
    } else {
      onDone(true)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-teal-800">
          {isNew ? `➕ ${t('newPlace')}` : `✏️ ${form.name}`}
        </h2>
        <button
          type="button"
          onClick={() => onDone(false)}
          className="text-sm font-medium text-slate-500"
        >
          {t('cancel')}
        </button>
      </div>

      <form onSubmit={handleSave} className="mt-3 space-y-3">
        <Field label={t('name')}>
          <input
            required
            value={form.name}
            onChange={(e) => {
              set('name', e.target.value)
              if (!slugTouched) set('slug', slugify(e.target.value))
            }}
            className={inputCls}
          />
        </Field>
        <Field label={t('slugLabel')}>
          <input
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              set('slug', e.target.value)
            }}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('categoryField')}>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
            >
              {Object.keys(CATEGORIES).map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key].emoji} {key}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('difficulty')}>
            <select
              value={form.difficulty}
              onChange={(e) => set('difficulty', e.target.value)}
              className={inputCls}
            >
              <option value="">{t('none')}</option>
              <option value="easy">{t('easy')}</option>
              <option value="moderate">{t('moderate')}</option>
              <option value="hard">{t('hard')}</option>
            </select>
          </Field>
        </div>
        <Field label={t('municipality')}>
          <input
            required
            value={form.municipality}
            onChange={(e) => set('municipality', e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('latitude')}>
            <input
              required
              type="number"
              step="any"
              min="17.8"
              max="18.6"
              value={form.lat}
              onChange={(e) => set('lat', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label={t('longitude')}>
            <input
              required
              type="number"
              step="any"
              min="-67.4"
              max="-65.2"
              value={form.lng}
              onChange={(e) => set('lng', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label={t('descriptionEn')}>
          <textarea
            rows={3}
            value={form.description_en}
            onChange={(e) => set('description_en', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('descriptionEs')}>
          <textarea
            rows={3}
            value={form.description_es}
            onChange={(e) => set('description_es', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('tagsLabel')}>
          <input
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('hours')}>
            <input
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label={t('fees')}>
            <input
              value={form.fees}
              onChange={(e) => set('fees', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label={t('website')}>
          <input
            type="url"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('tipsEn')}>
          <textarea
            rows={2}
            value={form.tips_en}
            onChange={(e) => set('tips_en', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t('tipsEs')}>
          <textarea
            rows={2}
            value={form.tips_es}
            onChange={(e) => set('tips_es', e.target.value)}
            className={inputCls}
          />
        </Field>

        {status && (
          <p
            className={`text-sm ${status.kind === 'error' ? 'text-red-600' : 'text-teal-700'}`}
          >
            {status.text}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-teal-600 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? t('saving') : t('save')}
          </button>
          {!isNew && (
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded-xl bg-red-50 px-4 py-2.5 font-semibold text-red-600 disabled:opacity-50"
            >
              {t('delete')}
            </button>
          )}
        </div>
      </form>

      {isNew ? (
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
          {t('savePhotosHint')}
        </p>
      ) : (
        <PlacePhotos placeId={place.id} />
      )}
    </div>
  )
}

async function fetchFeedback() {
  const { data } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

function FeedbackInbox() {
  const { t, lang } = useI18n()
  const [items, setItems] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchFeedback().then((data) => {
      if (!cancelled) setItems(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function load() {
    setItems(await fetchFeedback())
  }

  async function remove(id) {
    await supabase.from('feedback').delete().eq('id', id)
    load()
  }

  if (!items) return <p className="mt-4 text-sm text-slate-500">{t('loading')}</p>

  return (
    <div className="mt-3 space-y-3">
      {items.length === 0 && <p className="text-sm text-slate-500">{t('noFeedback')}</p>}
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="truncate">
              {item.kind === 'help' ? '🆘' : '💬'} {item.email || 'anonymous'}
              {item.page ? ` · ${item.page}` : ''}
            </span>
            <span className="shrink-0">
              {new Date(item.created_at).toLocaleDateString(lang === 'es' ? 'es-PR' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600"
          >
            {t('delete')}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const { t, lang } = useI18n()
  const [places, setPlaces] = useState([])
  const [search, setSearch] = useState('')
  // null = list view, 'new' = creating, object = editing
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('places')

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetchAllPlaces().then((data) => {
      if (!cancelled) setPlaces(data)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  async function loadPlaces() {
    setPlaces(await fetchAllPlaces())
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return places
    return places.filter(
      (p) => p.name.toLowerCase().includes(q) || p.municipality.toLowerCase().includes(q),
    )
  }, [places, search])

  if (loading) return <div className="p-8 text-center text-slate-500">{t('loading')}</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin)
    return <div className="p-8 text-center text-slate-500">{t('adminOnly')}</div>

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold text-teal-800">🛠️ {t('adminPortal')}</h1>

      <div className="mt-3 flex gap-2">
        {[
          ['places', `📍 ${t('places')}`],
          ['feedback', `💬 ${t('feedbackInbox')}`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'feedback' ? (
        <FeedbackInbox />
      ) : editing ? (
        <div className="mt-3">
          <PlaceEditor
            place={editing === 'new' ? null : editing}
            onDone={(changed) => {
              setEditing(null)
              if (changed) loadPlaces()
            }}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaces')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="shrink-0 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              ➕ {t('newPlace')}
            </button>
          </div>
          <ul className="mt-3 space-y-2 pb-4">
            {visible.map((place) => {
              const cat = CATEGORIES[place.category] ?? CATEGORIES.landmark
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(place)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${cat.color}22` }}
                    >
                      {cat.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{place.name}</span>
                      <span className="block text-sm text-slate-500">
                        {categoryLabel(place.category, lang)} · {place.municipality}
                      </span>
                    </span>
                    <span className="text-sm text-slate-400">✏️</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
