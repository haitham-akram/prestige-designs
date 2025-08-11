'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/ui/FileUpload'
import Alert, { useAlerts } from '@/components/ui/Alert'
import { useFileUpload } from '@/hooks/useFileUpload'
import './settings.css'
import Image from 'next/image'

type Branding = { logoUrl?: string; logoPublicId?: string; faviconUrl?: string; faviconPublicId?: string }
type Social = {
  telegram?: string
  discord?: string
  whatsapp?: string
  youtube?: string
  tiktok?: string
  text?: string
}
type FAQ = {
  _id?: string
  question: string
  answer: string
  order?: number
  isActive?: boolean
}
type HeroSlide = {
  _id?: string
  imageUrl: string
  imagePublicId?: string
  title?: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  order?: number
  isActive?: boolean
}
type FeaturedClient = {
  _id?: string
  name: string
  imageUrl: string
  imagePublicId?: string
  link?: string
  order?: number
  isActive?: boolean
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'branding' | 'social' | 'hero' | 'faq' | 'discord' | 'clients'>('branding')
  const [branding, setBranding] = useState<Branding>({})
  const [social, setSocial] = useState<Social>({})
  const [saving, setSaving] = useState(false)
  const { alerts, showSuccess, showError } = useAlerts()
  const [resetKey, setResetKey] = useState(0)
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [slidesLoading, setSlidesLoading] = useState(false)
  const [newSlide, setNewSlide] = useState<HeroSlide>({
    imageUrl: '',
    title: '',
    subtitle: '',
    ctaText: '',
    ctaHref: '',
    order: (slides?.length || 0) + 1,
    isActive: true,
  })
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [faqsLoading, setFaqsLoading] = useState(false)
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '', order: 1, isActive: true })
  const [discord, setDiscord] = useState<{
    imageUrl?: string
    imagePublicId?: string
    title?: string
    description?: string
  }>({})
  const [hasExistingDiscord, setHasExistingDiscord] = useState(false)
  const [clients, setClients] = useState<FeaturedClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [newClient, setNewClient] = useState<FeaturedClient>({
    name: '',
    imageUrl: '',
    link: '',
    order: 1,
    isActive: true,
  })
  const [clientImageEditorOpenId, setClientImageEditorOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'admin') router.push('/access-denied')
  }, [status, session, router])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          setBranding(res.data.branding || {})
          setSocial(res.data.social || {})
          const initialDiscord = res.data.discordBanner || {}
          setDiscord(initialDiscord)
          const hadDiscord = Boolean(
            initialDiscord?.imageUrl ||
              initialDiscord?.imagePublicId ||
              initialDiscord?.title ||
              initialDiscord?.description
          )
          setHasExistingDiscord(hadDiscord)
        }
      })
  }, [])

  // Fetch hero slides when tab opens (and once on mount if default)
  useEffect(() => {
    if (activeTab === 'hero') {
      void fetchSlides()
    }
    if (activeTab === 'faq') {
      void fetchFaqs()
    }
    if (activeTab === 'clients') {
      void fetchClients()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchSlides = async () => {
    try {
      setSlidesLoading(true)
      const r = await fetch('/api/admin/hero')
      const res = await r.json()
      if (r.ok) {
        setSlides(res.data || [])
      } else {
        showError('خطأ', 'تعذر جلب السلايدر')
      }
    } catch {
      showError('خطأ', 'تعذر جلب السلايدر')
    } finally {
      setSlidesLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      const r = await fetch('/api/admin/featured-clients')
      const res = await r.json()
      if (r.ok) {
        setClients(res.data || [])
      }
    } catch {
      // handled silently
    } finally {
      setClientsLoading(false)
    }
  }

  const fetchFaqs = async () => {
    try {
      setFaqsLoading(true)
      const r = await fetch('/api/admin/faq')
      const res = await r.json()
      if (r.ok) {
        setFaqs(res.data || [])
      } else {
        showError('خطأ', 'تعذر جلب الأسئلة الشائعة')
      }
    } catch {
      showError('خطأ', 'تعذر جلب الأسئلة الشائعة')
    } finally {
      setFaqsLoading(false)
    }
  }

  const saveBranding = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding }),
      })
      setSaving(false)
      if (!res.ok) {
        const err = await res.text()
        showError('فشل الحفظ', err || 'حدث خطأ أثناء الحفظ')
        return
      }
      showSuccess('تم الحفظ', 'تم حفظ إعدادات العلامة التجارية بنجاح')
      // Reset form state after successful save
      setBranding({})
      resetLogo()
      resetFavicon()
      setResetKey((k) => k + 1)
    } catch (e) {
      setSaving(false)
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحفظ', message)
    }
  }

  // Independent uploaders and progress for each field
  const {
    uploadFile: uploadLogo,
    uploadProgress: logoProgress,
    resetUpload: resetLogo,
  } = useFileUpload({
    onSuccess: (result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] }) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      setBranding((b) => ({ ...b, logoUrl: url, logoPublicId: publicId }))
      showSuccess('تم رفع الشعار', 'تم رفع صورة الشعار بنجاح')
    },
    onError: (msg) => showError('فشل رفع الشعار', String(msg || 'حدث خطأ غير متوقع')),
  })

  // Upload for updating an existing client's image
  const [clientImageChangeTargetId, setClientImageChangeTargetId] = useState<string | null>(null)
  const {
    uploadFile: uploadExistingClientImage,
    uploadProgress: existingClientUploadProgress,
    resetUpload: resetExistingClientUpload,
  } = useFileUpload({
    onSuccess: (
      result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] },
      fileInfo?: Record<string, unknown>
    ) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      const targetId = (fileInfo?.clientId as string) || clientImageChangeTargetId || null
      if (targetId && url) {
        setClients((arr) => arr.map((c) => (c._id === targetId ? { ...c, imageUrl: url, imagePublicId: publicId } : c)))
        updateClient(targetId, { imageUrl: url, imagePublicId: publicId })
        setClientImageEditorOpenId(null)
        setClientImageChangeTargetId(null)
      }
      showSuccess('تم الرفع', 'تم تحديث صورة العميل')
    },
    onError: (msg) => showError('فشل الرفع', String(msg || 'حدث خطأ غير متوقع')),
  })
  const {
    uploadFile: uploadFavicon,
    uploadProgress: faviconProgress,
    resetUpload: resetFavicon,
  } = useFileUpload({
    onSuccess: (result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] }) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      setBranding((b) => ({ ...b, faviconUrl: url, faviconPublicId: publicId }))
      showSuccess('تم رفع الأيقونة', 'تم رفع صورة الأيقونة بنجاح')
    },
    onError: (msg) => showError('فشل رفع الأيقونة', String(msg || 'حدث خطأ غير متوقع')),
  })

  const handleImageFile = async (file: File, field: 'logo' | 'favicon') => {
    if (field === 'logo') {
      await uploadLogo(file, '/api/admin/upload/image')
    } else {
      await uploadFavicon(file, '/api/admin/upload/image')
    }
  }

  const removeBrandingImage = (field: 'logo' | 'favicon') => {
    setBranding((b) => ({ ...b, [`${field}Url`]: undefined, [`${field}PublicId`]: undefined }))
  }

  // Social helpers
  const normalizeTelegram = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http')) return trimmed
    const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed.replace(/^t\.me\//, '')
    return `https://t.me/${handle}`
  }

  const normalizeWhatsApp = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http')) return trimmed
    const digits = trimmed.replace(/[^0-9]/g, '')
    return digits ? `https://wa.me/${digits}` : ''
  }

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const saveSocial = async () => {
    try {
      setSaving(true)
      const payload = {
        social: {
          telegram: normalizeTelegram(social.telegram || ''),
          discord: social.discord ? normalizeUrl(social.discord) : '',
          whatsapp: normalizeWhatsApp(social.whatsapp || ''),
          youtube: social.youtube ? normalizeUrl(social.youtube) : '',
          tiktok: social.tiktok ? normalizeUrl(social.tiktok) : '',
          text: social.text || '',
        },
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.ok) {
        const err = await res.text()
        showError('فشل الحفظ', err || 'حدث خطأ أثناء الحفظ')
        return
      }
      const normalized = payload.social
      setSocial(normalized)
      showSuccess('تم الحفظ', 'تم حفظ روابط التواصل بنجاح')
    } catch (e) {
      setSaving(false)
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحفظ', message)
    }
  }

  // New slide image upload
  const {
    uploadFile: uploadHeroImage,
    uploadProgress: heroUploadProgress,
    resetUpload: resetHeroUpload,
  } = useFileUpload({
    onSuccess: (result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] }) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      setNewSlide((s) => ({ ...s, imageUrl: url || '', imagePublicId: publicId }))
      showSuccess('تم الرفع', 'تم رفع صورة السلايد بنجاح')
    },
    onError: (msg) => showError('فشل رفع الصورة', String(msg || 'حدث خطأ غير متوقع')),
  })

  const createSlide = async () => {
    if (!newSlide.imageUrl) {
      showError('الصورة مطلوبة', 'يرجى رفع صورة للسلايد')
      return
    }
    try {
      setSaving(true)
      const r = await fetch('/api/admin/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newSlide.imageUrl,
          imagePublicId: newSlide.imagePublicId,
          title: newSlide.title,
          subtitle: newSlide.subtitle,
          ctaText: newSlide.ctaText,
          ctaHref: newSlide.ctaHref ? normalizeUrl(newSlide.ctaHref) : '',
          order: newSlide.order ?? slides.length + 1,
          isActive: newSlide.isActive ?? true,
        }),
      })
      setSaving(false)
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الإضافة', err || 'حدث خطأ أثناء الإضافة')
        return
      }
      showSuccess('تمت الإضافة', 'تمت إضافة السلايد بنجاح')
      // Reset form and refresh
      setNewSlide({
        imageUrl: '',
        title: '',
        subtitle: '',
        ctaText: '',
        ctaHref: '',
        order: (slides?.length || 0) + 1,
        isActive: true,
      })
      resetHeroUpload()
      setResetKey((k) => k + 1)
      await fetchSlides()
    } catch (e) {
      setSaving(false)
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الإضافة', message)
    }
  }

  const updateSlide = async (id: string, patch: Partial<HeroSlide>) => {
    try {
      const r = await fetch(`/api/admin/hero/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل التحديث', err || 'تعذر تحديث السلايد')
        return
      }
      showSuccess('تم التحديث', 'تم تحديث السلايد بنجاح')
      await fetchSlides()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل التحديث', message)
    }
  }

  const deleteSlide = async (id: string) => {
    if (!confirm('هل تريد حذف هذا السلايد؟')) return
    try {
      const r = await fetch(`/api/admin/hero/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الحذف', err || 'تعذر حذف السلايد')
        return
      }
      showSuccess('تم الحذف', 'تم حذف السلايد بنجاح')
      await fetchSlides()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحذف', message)
    }
  }

  // FAQ CRUD
  const createFaq = async () => {
    if (!newFaq.question || !newFaq.answer) {
      showError('بيانات ناقصة', 'يرجى إدخال السؤال والإجابة')
      return
    }
    try {
      const r = await fetch('/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFaq),
      })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الإضافة', err || 'تعذر إضافة السؤال')
        return
      }
      showSuccess('تمت الإضافة', 'تمت إضافة السؤال بنجاح')
      setNewFaq({ question: '', answer: '', order: (faqs?.length || 0) + 1, isActive: true })
      await fetchFaqs()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الإضافة', message)
    }
  }

  const updateFaq = async (id: string, patch: Partial<FAQ>) => {
    try {
      const r = await fetch(`/api/admin/faq/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل التحديث', err || 'تعذر تحديث السؤال')
        return
      }
      showSuccess('تم التحديث', 'تم تحديث السؤال بنجاح')
      await fetchFaqs()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل التحديث', message)
    }
  }

  const deleteFaq = async (id: string) => {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return
    try {
      const r = await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الحذف', err || 'تعذر حذف السؤال')
        return
      }
      showSuccess('تم الحذف', 'تم حذف السؤال بنجاح')
      await fetchFaqs()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحذف', message)
    }
  }

  // Discord banner upload/save (independent state)
  const {
    uploadFile: uploadDiscord,
    uploadProgress: discordProgress,
    resetUpload: resetDiscord,
  } = useFileUpload({
    onSuccess: (result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] }) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      setDiscord((d) => ({ ...d, imageUrl: url, imagePublicId: publicId }))
      showSuccess('تم الرفع', 'تم رفع صورة البانر بنجاح')
    },
    onError: (msg) => showError('فشل رفع الصورة', String(msg || 'حدث خطأ غير متوقع')),
  })

  const uploadDiscordBanner = async (file: File) => {
    await uploadDiscord(file, '/api/admin/upload/image')
  }

  const saveDiscord = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordBanner: discord }),
      })
      setSaving(false)
      if (!res.ok) {
        const err = await res.text()
        showError('فشل الحفظ', err || 'تعذر حفظ قسم الديسكورد')
        return
      }
      showSuccess('تم الحفظ', 'تم حفظ قسم الديسكورد بنجاح')
    } catch (e) {
      setSaving(false)
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحفظ', message)
    }
  }

  // Featured clients CRUD
  const {
    uploadFile: uploadClientImage,
    uploadProgress: clientUploadProgress,
    resetUpload: resetClientUpload,
  } = useFileUpload({
    onSuccess: (result: { data?: Array<{ url?: string; publicId?: string }>; urls?: string[] }) => {
      const url = result?.data?.[0]?.url || result?.urls?.[0]
      const publicId = result?.data?.[0]?.publicId
      setNewClient((c) => ({ ...c, imageUrl: url || '', imagePublicId: publicId }))
      showSuccess('تم الرفع', 'تم رفع صورة العميل بنجاح')
    },
    onError: (msg) => showError('فشل الرفع', String(msg || 'حدث خطأ غير متوقع')),
  })

  const createClient = async () => {
    if (!newClient.name || !newClient.imageUrl) {
      showError('بيانات ناقصة', 'يرجى إدخال الاسم ورفع الصورة')
      return
    }
    try {
      const r = await fetch('/api/admin/featured-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الإضافة', err || 'تعذر إضافة العميل')
        return
      }
      showSuccess('تمت الإضافة', 'تمت إضافة العميل بنجاح')
      setNewClient({ name: '', imageUrl: '', link: '', order: (clients?.length || 0) + 1, isActive: true })
      resetClientUpload()
      await fetchClients()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الإضافة', message)
    }
  }

  const updateClient = async (id: string, patch: Partial<FeaturedClient>) => {
    try {
      const r = await fetch(`/api/admin/featured-clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل التحديث', err || 'تعذر تحديث العميل')
        return
      }
      showSuccess('تم التحديث', 'تم تحديث العميل بنجاح')
      await fetchClients()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل التحديث', message)
    }
  }

  const deleteClient = async (id: string) => {
    if (!confirm('هل تريد حذف هذا العميل؟')) return
    try {
      const r = await fetch(`/api/admin/featured-clients/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const err = await r.text()
        showError('فشل الحذف', err || 'تعذر حذف العميل')
        return
      }
      showSuccess('تم الحذف', 'تم حذف العميل بنجاح')
      await fetchClients()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
      showError('فشل الحذف', message)
    }
  }

  if (status === 'loading' || !session || session.user.role !== 'admin') return null

  return (
    <div className="admin-settings-container">
      <div className="alerts-container">
        {alerts.map((a, i) => (
          <Alert key={i} {...a} />
        ))}
      </div>
      <div className="settings-header">
        <div className="header-content">
          <h1>إعدادات الموقع</h1>
          <p>إدارة العلامة التجارية والروابط والسلايدر والأقسام العامة</p>
        </div>
      </div>
      <div className="tabs">
        {(
          [
            ['branding', 'العلامة التجارية'],
            ['social', 'روابط التواصل'],
            ['hero', 'السلايدر'],
            ['faq', 'الأسئلة الشائعة'],
            ['discord', 'قسم الديسكورد'],
            ['clients', 'العملاء المميزون'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' && (
        <div className="branding-tab">
          <h2 className="section-title">العلامة التجارية</h2>
          <div className="grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr' }}>
            <div className="card">
              <label className="nice-label">الشعار (Logo)</label>
              <FileUpload
                key={`logo-${resetKey}`}
                accept="image/*"
                onFileSelect={(f) => handleImageFile(f, 'logo')}
                label="رفع الشعار"
                maxSize={10}
                externalProgress={logoProgress}
                onReset={resetLogo}
                placeholder="اختر صورة أو اسحب صورة"
                disabled={!!branding.logoUrl}
              />
              {branding.logoUrl && (
                <div className="image-preview">
                  <Image src={branding.logoUrl} alt="logo" unoptimized width={120} height={120} />
                  <button type="button" className="remove-image-btn" onClick={() => removeBrandingImage('logo')}>
                    حذف
                  </button>
                </div>
              )}
            </div>
            <div className="card">
              <label className="nice-label">الأيقونة (Favicon)</label>
              <FileUpload
                key={`favicon-${resetKey}`}
                accept="image/*"
                onFileSelect={(f) => handleImageFile(f, 'favicon')}
                label="رفع الأيقونة"
                maxSize={2}
                externalProgress={faviconProgress}
                onReset={resetFavicon}
                placeholder="اختر صورة أو اسحب صورة"
                disabled={!!branding.faviconUrl}
              />
              {branding.faviconUrl && (
                <div className="image-preview">
                  <Image src={branding.faviconUrl} alt="favicon" unoptimized width={120} height={120} />
                  <button type="button" className="remove-image-btn" onClick={() => removeBrandingImage('favicon')}>
                    حذف
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="save-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={saveBranding} disabled={saving}>
              {saving ? 'جار الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'discord' && (
        <div className="discord-tab">
          <h2 className="section-title">قسم الديسكورد</h2>
          <div className="card">
            <div className="form-group">
              <label className="nice-label">صورة البانر</label>
              <FileUpload
                key={`discord-upload-${resetKey}`}
                accept="image/*"
                onFileSelect={(f) => uploadDiscordBanner(f)}
                label="رفع الصورة"
                maxSize={10}
                externalProgress={discordProgress}
                onReset={resetDiscord}
                placeholder="اختر صورة أو اسحب صورة"
                disabled={!!discord.imageUrl}
              />
              {discord.imageUrl && (
                <div className="image-preview">
                  <Image src={discord.imageUrl} alt="discord banner" unoptimized width={320} height={180} />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => setDiscord((d) => ({ ...d, imageUrl: undefined, imagePublicId: undefined }))}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="nice-label">العنوان</label>
                <input
                  className="text-input"
                  value={discord.title || ''}
                  onChange={(e) => setDiscord((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الوصف</label>
                <textarea
                  className="text-input textarea"
                  rows={3}
                  value={discord.description || ''}
                  onChange={(e) => setDiscord((d) => ({ ...d, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="save-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveDiscord} disabled={saving}>
                {saving ? 'جار الحفظ...' : hasExistingDiscord ? 'حفظ التغيرات' : 'حفظ القسم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="clients-tab">
          <h2 className="section-title">العملاء المميزون</h2>

          {/* Add new client */}
          <div className="card add-client-card">
            <div className="form-group">
              <label className="nice-label">صورة العميل</label>
              <FileUpload
                key={`client-upload-${resetKey}`}
                accept="image/*"
                onFileSelect={(f) => uploadClientImage(f, '/api/admin/upload/image')}
                label="رفع الصورة"
                maxSize={10}
                externalProgress={clientUploadProgress}
                onReset={resetClientUpload}
                placeholder="اختر صورة أو اسحب صورة"
                disabled={!!newClient.imageUrl}
              />
              {newClient.imageUrl && (
                <div className="image-preview">
                  <Image src={newClient.imageUrl} alt="client" unoptimized width={160} height={160} />
                </div>
              )}
            </div>

            <div
              className="form-row"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '1rem' }}
            >
              <div className="form-group">
                <label className="nice-label">الاسم</label>
                <input
                  className="text-input"
                  value={newClient.name}
                  onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الرابط (اختياري)</label>
                <input
                  className="text-input"
                  value={newClient.link || ''}
                  onChange={(e) => setNewClient((c) => ({ ...c, link: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الترتيب</label>
                <input
                  className="text-input"
                  type="number"
                  value={newClient.order ?? 0}
                  onChange={(e) => setNewClient((c) => ({ ...c, order: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الحالة</label>
                <select
                  className="text-input"
                  value={String(newClient.isActive ?? true)}
                  onChange={(e) => setNewClient((c) => ({ ...c, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>
            </div>

            <div className="save-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={createClient}>
                إضافة عميل
              </button>
            </div>
          </div>

          {/* Clients list */}
          <div className="clients-list">
            {clientsLoading ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>جاري التحميل...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>لا يوجد عملاء بعد.</p>
              </div>
            ) : (
              clients.map((client) => (
                <div key={client._id} className="card client-item">
                  <div className="client-grid">
                    <div className="client-image">
                      {client.imageUrl ? (
                        <Image src={client.imageUrl} alt={client.name} unoptimized width={120} height={120} />
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() =>
                          setClientImageEditorOpenId((openId) => (openId === client._id ? null : client._id!))
                        }
                      >
                        تغيير الصورة
                      </button>
                      {clientImageEditorOpenId === client._id && (
                        <div className="change-image-wrapper" style={{ marginTop: '0.5rem' }}>
                          <FileUpload
                            accept="image/*"
                            externalProgress={existingClientUploadProgress}
                            onReset={resetExistingClientUpload}
                            onFileSelect={async (f) => {
                              setClientImageChangeTargetId(client._id!)
                              await uploadExistingClientImage(f, '/api/admin/upload/image', undefined, {
                                clientId: client._id,
                              })
                            }}
                            maxSize={10}
                          />
                        </div>
                      )}
                    </div>
                    <div className="client-fields">
                      <div
                        className="form-row"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '0.75rem' }}
                      >
                        <input
                          className="text-input"
                          placeholder="الاسم"
                          value={client.name}
                          onChange={(e) =>
                            setClients((arr) =>
                              arr.map((c) => (c._id === client._id ? { ...c, name: e.target.value } : c))
                            )
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="الرابط"
                          value={client.link || ''}
                          onChange={(e) =>
                            setClients((arr) =>
                              arr.map((c) => (c._id === client._id ? { ...c, link: e.target.value } : c))
                            )
                          }
                        />
                        <input
                          className="text-input"
                          type="number"
                          value={client.order ?? 0}
                          onChange={(e) =>
                            setClients((arr) =>
                              arr.map((c) => (c._id === client._id ? { ...c, order: Number(e.target.value) } : c))
                            )
                          }
                        />
                        <select
                          className="text-input"
                          value={String(client.isActive ?? true)}
                          onChange={(e) =>
                            setClients((arr) =>
                              arr.map((c) => (c._id === client._id ? { ...c, isActive: e.target.value === 'true' } : c))
                            )
                          }
                        >
                          <option value="true">نشط</option>
                          <option value="false">غير نشط</option>
                        </select>
                      </div>
                      <div className="slide-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            updateClient(client._id!, {
                              name: client.name,
                              link: client.link,
                              order: client.order,
                              isActive: client.isActive,
                            })
                          }
                        >
                          تحديث
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteClient(client._id!)}>
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="social-tab">
          <h2 className="section-title">روابط التواصل</h2>
          <div className="grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr' }}>
            <div className="card">
              <div className="form-group">
                <label className="nice-label" htmlFor="telegram">
                  تيليجرام
                </label>
                <input
                  id="telegram"
                  className="text-input"
                  placeholder="رابط تيليجرام أو @username"
                  value={social.telegram || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, telegram: e.target.value }))}
                />
                <span className="input-hint">مثال: @prestige أو https://t.me/prestige</span>
              </div>
              <div className="form-group">
                <label className="nice-label" htmlFor="discord">
                  ديسكورد
                </label>
                <input
                  id="discord"
                  className="text-input"
                  placeholder="رابط دعوة الديسكورد"
                  value={social.discord || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, discord: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label" htmlFor="whatsapp">
                  واتساب
                </label>
                <input
                  id="whatsapp"
                  className="text-input"
                  placeholder="رقم واتساب (بدون +) أو رابط wa.me"
                  value={social.whatsapp || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, whatsapp: e.target.value }))}
                />
                <span className="input-hint">مثال: 9705XXXXXXXX أو https://wa.me/9705XXXXXXXX</span>
              </div>
              <div className="form-group">
                <label className="nice-label" htmlFor="youtube">
                  يوتيوب
                </label>
                <input
                  id="youtube"
                  className="text-input"
                  placeholder="رابط قناة اليوتيوب"
                  value={social.youtube || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, youtube: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label" htmlFor="tiktok">
                  تيك توك
                </label>
                <input
                  id="tiktok"
                  className="text-input"
                  placeholder="رابط حساب تيك توك"
                  value={social.tiktok || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, tiktok: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label" htmlFor="social-text">
                  نص التواصل الاجتماعي
                </label>
                <textarea
                  id="social-text"
                  className="text-input"
                  placeholder="نص يظهر في صفحة الموقع (مثال: تابعنا على وسائل التواصل الاجتماعي)"
                  value={social.text || ''}
                  onChange={(e) => setSocial((s) => ({ ...s, text: e.target.value }))}
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
                <span className="input-hint">هذا النص سيظهر في صفحة الموقع مع روابط التواصل الاجتماعي</span>
              </div>
            </div>
          </div>
          <div className="save-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={saveSocial} disabled={saving}>
              {saving ? 'جار الحفظ...' : 'حفظ الروابط'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="hero-tab">
          <h2 className="section-title">سلايدر الصفحة الرئيسية</h2>

          {/* Add new slide */}
          <div className="card add-slide-card">
            <div className="form-group">
              <label className="nice-label">صورة السلايد</label>
              <FileUpload
                key={`hero-upload-${resetKey}`}
                accept="image/*"
                onFileSelect={(f) => uploadHeroImage(f, '/api/admin/upload/image')}
                label="رفع الصورة"
                maxSize={20}
                externalProgress={heroUploadProgress}
                onReset={resetHeroUpload}
                placeholder="اختر صورة أو اسحب صورة"
                disabled={!!newSlide.imageUrl}
              />
              {newSlide.imageUrl && (
                <div className="image-preview">
                  <Image src={newSlide.imageUrl} alt="hero" unoptimized width={320} height={180} />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => setNewSlide((s) => ({ ...s, imageUrl: '', imagePublicId: undefined }))}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="nice-label">العنوان</label>
                <input
                  className="text-input"
                  value={newSlide.title || ''}
                  onChange={(e) => setNewSlide((s) => ({ ...s, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">النص الفرعي</label>
                <input
                  className="text-input"
                  value={newSlide.subtitle || ''}
                  onChange={(e) => setNewSlide((s) => ({ ...s, subtitle: e.target.value }))}
                />
              </div>
            </div>
            <div
              className="form-row"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '1rem' }}
            >
              <div className="form-group">
                <label className="nice-label">نص الزر</label>
                <input
                  className="text-input"
                  value={newSlide.ctaText || ''}
                  onChange={(e) => setNewSlide((s) => ({ ...s, ctaText: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">رابط الزر</label>
                <input
                  className="text-input"
                  value={newSlide.ctaHref || ''}
                  onChange={(e) => setNewSlide((s) => ({ ...s, ctaHref: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الترتيب</label>
                <input
                  className="text-input"
                  type="number"
                  value={newSlide.order ?? 0}
                  onChange={(e) => setNewSlide((s) => ({ ...s, order: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الحالة</label>
                <select
                  className="text-input"
                  value={String(newSlide.isActive ?? true)}
                  onChange={(e) => setNewSlide((s) => ({ ...s, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>
            </div>
            <div className="save-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={createSlide} disabled={saving}>
                {saving ? 'جار الحفظ...' : 'إضافة السلايد'}
              </button>
            </div>
          </div>

          {/* Existing slides */}
          <div className="slides-list">
            {slidesLoading ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>جاري التحميل...</p>
              </div>
            ) : slides.length === 0 ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>لا توجد سلايدات بعد.</p>
              </div>
            ) : (
              slides.map((slide) => (
                <div key={slide._id} className="card hero-slide-item">
                  <div className="hero-slide-grid">
                    <div className="hero-slide-image">
                      {slide.imageUrl ? (
                        <Image src={slide.imageUrl} alt={slide.title || 'slide'} unoptimized width={240} height={135} />
                      ) : null}
                    </div>
                    <div className="hero-slide-fields">
                      <div
                        className="form-row"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
                      >
                        <input
                          className="text-input"
                          placeholder="العنوان"
                          value={slide.title || ''}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, title: e.target.value } : s))
                            )
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="النص الفرعي"
                          value={slide.subtitle || ''}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, subtitle: e.target.value } : s))
                            )
                          }
                        />
                      </div>
                      <div
                        className="form-row"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '0.75rem' }}
                      >
                        <input
                          className="text-input"
                          placeholder="نص الزر"
                          value={slide.ctaText || ''}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, ctaText: e.target.value } : s))
                            )
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="رابط الزر"
                          value={slide.ctaHref || ''}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, ctaHref: e.target.value } : s))
                            )
                          }
                        />
                        <input
                          className="text-input"
                          type="number"
                          value={slide.order ?? 0}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, order: Number(e.target.value) } : s))
                            )
                          }
                        />
                        <select
                          className="text-input"
                          value={String(slide.isActive ?? true)}
                          onChange={(e) =>
                            setSlides((arr) =>
                              arr.map((s) => (s._id === slide._id ? { ...s, isActive: e.target.value === 'true' } : s))
                            )
                          }
                        >
                          <option value="true">نشط</option>
                          <option value="false">غير نشط</option>
                        </select>
                      </div>
                      <div className="slide-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            updateSlide(slide._id!, {
                              title: slide.title,
                              subtitle: slide.subtitle,
                              ctaText: slide.ctaText,
                              ctaHref: slide.ctaHref ? normalizeUrl(slide.ctaHref) : '',
                              order: slide.order,
                              isActive: slide.isActive,
                            })
                          }
                        >
                          تحديث
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteSlide(slide._id!)}>
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'faq' && (
        <div className="faq-tab">
          <h2 className="section-title">الأسئلة الشائعة</h2>
          {/* New FAQ */}
          <div className="card faq-add-card">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="nice-label">السؤال</label>
                <input
                  className="text-input"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="nice-label">الإجابة</label>
                <textarea
                  className="text-input textarea"
                  rows={3}
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
                />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '120px 120px', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="nice-label">الترتيب</label>
                  <input
                    className="text-input"
                    type="number"
                    value={newFaq.order ?? 0}
                    onChange={(e) => setNewFaq((f) => ({ ...f, order: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="nice-label">الحالة</label>
                  <select
                    className="text-input"
                    value={String(newFaq.isActive ?? true)}
                    onChange={(e) => setNewFaq((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                  >
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="save-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={createFaq}>
                إضافة سؤال
              </button>
            </div>
          </div>

          {/* FAQ list */}
          <div className="faq-list">
            {faqsLoading ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>جاري التحميل...</p>
              </div>
            ) : faqs.length === 0 ? (
              <div className="placeholder" style={{ opacity: 0.7 }}>
                <p>لا توجد أسئلة بعد.</p>
              </div>
            ) : (
              faqs.map((item) => (
                <div key={item._id} className="card faq-item">
                  <div className="form-group">
                    <label className="nice-label">السؤال</label>
                    <input
                      className="text-input"
                      value={item.question}
                      onChange={(e) =>
                        setFaqs((arr) => arr.map((f) => (f._id === item._id ? { ...f, question: e.target.value } : f)))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="nice-label">الإجابة</label>
                    <textarea
                      className="text-input textarea"
                      rows={3}
                      value={item.answer}
                      onChange={(e) =>
                        setFaqs((arr) => arr.map((f) => (f._id === item._id ? { ...f, answer: e.target.value } : f)))
                      }
                    />
                  </div>
                  <div
                    className="form-row"
                    style={{ display: 'grid', gridTemplateColumns: '120px 120px', gap: '0.75rem' }}
                  >
                    <input
                      className="text-input"
                      type="number"
                      value={item.order ?? 0}
                      onChange={(e) =>
                        setFaqs((arr) =>
                          arr.map((f) => (f._id === item._id ? { ...f, order: Number(e.target.value) } : f))
                        )
                      }
                    />
                    <select
                      className="text-input"
                      value={String(item.isActive ?? true)}
                      onChange={(e) =>
                        setFaqs((arr) =>
                          arr.map((f) => (f._id === item._id ? { ...f, isActive: e.target.value === 'true' } : f))
                        )
                      }
                    >
                      <option value="true">نشط</option>
                      <option value="false">غير نشط</option>
                    </select>
                  </div>
                  <div className="slide-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        updateFaq(item._id!, {
                          question: item.question,
                          answer: item.answer,
                          order: item.order,
                          isActive: item.isActive,
                        })
                      }
                    >
                      تحديث
                    </button>
                    <button className="btn btn-danger" onClick={() => deleteFaq(item._id!)}>
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
