import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, PackagePlus, Check, Pencil, Search, X, Mic } from 'lucide-react'
import { useLanguage } from '../i18n'
import { createBilingualRecognition, getSpeechRecognition, VOICE_INSECURE } from '../lib/voiceRecognition'
import { addOrIncrementCart } from '../utils/cart'

export default function AddItem({ savedItems, setSavedItems, setCart }) {
  const navigate = useNavigate()
  const { t, language } = useLanguage()

  const [searchQuery, setSearchQuery] = React.useState('')
  const deferredSearchQuery = React.useDeferredValue(searchQuery)
  const [isListening, setIsListening] = React.useState(false)
  const recognitionRef = React.useRef(null)
  const voiceSupport = React.useMemo(() => getSpeechRecognition(), [])
  const voiceAvailable = voiceSupport.ctor !== null
  const voiceMessage = !voiceAvailable
    ? voiceSupport.reason === VOICE_INSECURE
      ? t('voiceRequiresHttps')
      : t('voiceNotSupported')
    : ''

  const handleAddToCart = React.useCallback(
    (item) => {
      setCart((prev) => addOrIncrementCart(prev, item))
      navigate('/new-receipt')
    },
    [setCart, navigate]
  )

  const handleDeleteSaved = React.useCallback(
    (id) => {
      setSavedItems((prev) => prev.filter((item) => item.id !== id))
    },
    [setSavedItems]
  )

  const handleEditSaved = React.useCallback(
    (item) => {
      navigate('/add-product', { state: { editingProduct: item } })
    },
    [navigate]
  )

  const handleBack = React.useCallback(() => {
    navigate('/new-receipt')
  }, [navigate])

  const startListening = React.useCallback(() => {
    if (!voiceAvailable) {
      window.alert(voiceMessage || t('voiceNotSupported'))
      return
    }
    const { ctor: SpeechRecognition } = getSpeechRecognition()
    if (!SpeechRecognition) {
      setIsListening(false)
      window.alert(t('voiceNotSupported'))
      return
    }
    const session = createBilingualRecognition(SpeechRecognition, {
      onResult: (transcript, isFinal) => {
        setSearchQuery(transcript)
        if (isFinal) setIsListening(false)
      },
      onError: () => setIsListening(false),
      onEnd: () => setIsListening(false),
    }, [language === 'ta' ? 'ta-IN' : 'en-US'])
    recognitionRef.current = session
    setIsListening(session.recognitions.length > 0)
  }, [voiceAvailable, voiceMessage, t])

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [])

  React.useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
  }, [])

  const clearSearch = React.useCallback(() => setSearchQuery(''), [])

  const displayedItems = React.useMemo(() => {
    if (!deferredSearchQuery.trim()) return savedItems

    const query = deferredSearchQuery.trim().toLowerCase()
    const exact = []
    const partial = []

    savedItems.forEach((item) => {
      const name = (item.productName || '').toLowerCase()
      const tamil = (item.tamilName || '').toLowerCase()
      const haystack = `${name} ${tamil}`.trim()

      if (name === query || tamil === query) {
        exact.push(item)
      } else if (haystack.includes(query)) {
        partial.push(item)
      }
    })

    return [...exact, ...partial]
  }, [savedItems, deferredSearchQuery])

  return (
    <div className="min-h-screen w-full bg-[#f7f5fb] text-slate-800">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-[#f7f5fb] px-4 py-4 shadow-sm">
        <button
          type="button"
          aria-label={t('back')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>

        <h1 className="flex-1 text-center text-lg font-bold tracking-tight text-slate-900">{t('addItem')}</h1>

        <button
          type="button"
          aria-label={t('addProduct')}
          onClick={() => navigate('/add-product')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <Plus size={20} strokeWidth={2.2} />
        </button>
      </header>

      <main className="w-full overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchProducts')}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-24 py-3 text-base focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t('clearSearch')}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={!voiceAvailable}
                aria-label={isListening ? t('listening') : t('voiceSearch')}
                title={voiceAvailable ? t('voiceSearch') : (voiceMessage || t('voiceUnavailable'))}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  !voiceAvailable
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    : isListening
                      ? 'bg-red-100 text-red-500 animate-pulse'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Mic size={18} />
              </button>
            </div>
          </div>

          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-32 h-32 rounded-full bg-soft-purple/70 flex items-center justify-center mb-4 shadow-md">
                <PackagePlus size={40} className="text-purple-700" />
              </div>
              <p className="text-gray-400 text-lg">{t('productMgmtEmptyTitle')}</p>
              <p className="text-gray-400">{t('productMgmtEmptyTitle2')}</p>
              <p className="text-gray-400">{t('productMgmtEmptyTitle3')}</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search size={32} className="text-slate-400" />
              </div>
              <p className="text-gray-500 text-base font-medium">{t('noMatchingProducts')}</p>
              <p className="text-gray-400 text-sm mt-1">"{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate">{item.productName}</p>
                    {item.tamilName && (
                      <p className="text-sm text-slate-500 truncate">{item.tamilName}</p>
                    )}
                    {item.barcode && (
                      <p className="text-xs text-slate-400 mt-1">#{item.barcode}</p>
                    )}
                    <p className="text-base font-bold text-slate-900 mt-1">₹{Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handleEditSaved(item)}
                      aria-label={t('editProduct')}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-500 transition hover:bg-blue-100"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      aria-label={t('addItem')}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1fbf68] text-white shadow-sm transition hover:bg-[#18ab5b] active:bg-[#14943e]"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(item.id)}
                      aria-label={t('delete')}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="h-6"></div>
        </div>
      </main>
    </div>
  )
}
