import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Camera, Save, ScanLine, Sparkles, X, Loader, CheckCircle } from 'lucide-react'
import { useLanguage } from '../i18n'
import BarcodeScanner from '../components/BarcodeScanner'
import { useOcr } from '../../lib/ocr/useOcr'
import { transliterateToTamil } from '../../lib/ocr/transliterate'

export default function AddProduct(props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const editingProduct = location.state?.editingProduct || null

  const [productName, setProductName] = React.useState(editingProduct?.productName || '')
  const [tamilName, setTamilName] = React.useState(editingProduct?.tamilName || '')
  const [price, setPrice] = React.useState(editingProduct?.price || '')
  const [barcode, setBarcode] = React.useState(editingProduct?.barcode || '')
  const [frontPhoto, setFrontPhoto] = React.useState(null)
  const [backPhoto, setBackPhoto] = React.useState(null)
  const [showScanner, setShowScanner] = React.useState(false)
  const [toast, setToast] = React.useState('')
  const frontCameraRef = React.useRef(null)
   const backCameraRef = React.useRef(null)
    const tamilDebounceRef = React.useRef(null)
    const englishDebounceRef = React.useRef(null)
    const latestTamilRequest = React.useRef(0)
    const latestEnglishRequest = React.useRef(0)
    const translationCacheRef = React.useRef(new Map())

   const resetForm = () => {
     setProductName('')
     setTamilName('')
     setPrice('')
     setBarcode('')
     setFrontPhoto(null)
     setBackPhoto(null)
   }

     const translateToTamil = (text) => {
       if (!text.trim()) {
         setTamilName('')
         return
       }

       const requestId = ++latestTamilRequest.current
       clearTimeout(tamilDebounceRef.current)

       tamilDebounceRef.current = setTimeout(async () => {
         const cacheKey = `ta|${text}`
         const cached = translationCacheRef.current.get(cacheKey)
         if (cached !== undefined) {
           if (requestId === latestTamilRequest.current) {
             setTamilName(cached)
           }
           return
         }

         try {
           if (!navigator.onLine) throw new Error('offline')
           const response = await fetch(
             `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&q=${encodeURIComponent(text)}`
           )
           const res = await response.json()

           if (requestId === latestTamilRequest.current) {
             const translated = res?.[0]?.[0]?.[0] || ''
             translationCacheRef.current.set(cacheKey, translated)
             setTamilName(translated)
           }
         } catch (error) {
           // Offline fallback: use the local rule-based transliteration.
           if (requestId === latestTamilRequest.current) {
             const local = transliterateToTamil(text)
             if (local) setTamilName(local)
           }
         }
       }, 500)
     }

    const translateToEnglish = (text) => {
      if (!text.trim()) {
        setProductName('')
        return
      }

      const requestId = ++latestEnglishRequest.current
      clearTimeout(englishDebounceRef.current)

      englishDebounceRef.current = setTimeout(async () => {
        const cacheKey = `en|${text}`
        const cached = translationCacheRef.current.get(cacheKey)
        if (cached !== undefined) {
          if (requestId === latestEnglishRequest.current) {
            setProductName(cached)
          }
          return
        }

        try {
          const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t&q=${encodeURIComponent(text)}`
          )
          const res = await response.json()

          if (requestId === latestEnglishRequest.current) {
            const translated = res?.[0]?.[0]?.[0] || ''
            translationCacheRef.current.set(cacheKey, translated)
            setProductName(translated)
          }
        } catch (error) {
          console.error('Translation error:', error)
        }
      }, 500)
    }

  const handleCameraCapture = (e, setPhoto) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhoto(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerCamera = (inputRef) => {
    inputRef.current?.click()
  }

  const removePhoto = (setPhoto) => {
    setPhoto(null)
  }

  const { status: ocrStatus, progress: ocrProgress, fields: ocrFields, extract: extractOcr, error: ocrError, warmupOcrWorker } = useOcr()

  React.useEffect(() => {
    warmupOcrWorker().catch(() => {})
  }, [warmupOcrWorker])

  const handleExtractText = async () => {
    if (!frontPhoto && !backPhoto) return

    const result = await extractOcr({ front: frontPhoto, back: backPhoto })

    if (!result) {
      setToast(ocrError ? (t('ocrFailed') || 'Could not read the label. Try a clearer photo.') : (t('ocrFailed') || 'No text found'))
      setTimeout(() => setToast(''), 3000)
      return
    }

    if (result.name) {
      setProductName(result.name)
      setTamilName(transliterateToTamil(result.name))
    }
    if (!result.name) {
      setToast(t('ocrFailed') || 'Could not read the label. Try a clearer photo.')
      setTimeout(() => setToast(''), 3000)
    }
  }

  const handleScan = () => {
    setShowScanner(true)
  }

  const handleScanSuccess = (decodedText) => {
    setBarcode(decodedText)
  }

  const saveProduct = () => {
    const trimmedName = productName.trim()
    const trimmedPrice = price.trim()
    const numericPrice = Number(trimmedPrice)

    if (!trimmedName || !trimmedPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
      return
    }

    const trimmedBarcode = barcode.trim()
    const currentId = editingProduct?.id
    const existingProducts = props.existingProducts || []
    if (trimmedBarcode && existingProducts.some((p) => p.barcode === trimmedBarcode && p.id !== currentId)) {
      setToast(t('barcodeExists'))
      setTimeout(() => setToast(''), 3000)
      return
    }

    const savedItem = {
      id: currentId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      productName: trimmedName,
      tamilName: tamilName.trim(),
      price: numericPrice,
      barcode: trimmedBarcode,
    }

    if (props.onProductSaved) {
      props.onProductSaved(savedItem, currentId)
    }

    setToast(t('productSavedSuccess'))
    resetForm()

    setTimeout(() => {
      setToast('')
      navigate('/add-item')
    }, 800)
  }

  const handleBack = () => {
    resetForm()
    navigate(editingProduct ? '/add-item' : '/new-receipt')
  }

  return (
    <div className="min-h-screen w-full bg-[#f7f5fb] text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-[#f7f5fb] px-4 py-4 shadow-sm">
        <button
          type="button"
          aria-label={t('back')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>

        <h1 className="flex-1 text-center text-lg font-bold tracking-tight text-slate-900">{editingProduct ? t('editProduct') : t('addProductTitle')}</h1>

        <button
          type="button"
          aria-label={t('close')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      </header>

      {toast && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1fbf68] px-6 py-3 text-sm font-semibold text-white shadow-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      {/* Scrollable Content */}
      <main className="w-full overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Smart Auto-Fill Section */}
          <section className="rounded-[24px] border border-[#dfeaff] bg-[#edf5ff] p-4 shadow-sm shadow-blue-100/60">
            <h2 className="text-center text-base font-bold text-[#2f5cc9]">{t('smartAutoFill')}</h2>
            <p className="mt-2 text-center text-[0.8rem] leading-5 text-slate-600">{t('smartAutoFillDescription')}</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Front Camera Button */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => triggerCamera(frontCameraRef)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#dfe7f8] bg-white px-3 py-3 text-[0.76rem] font-medium text-slate-700 shadow-sm transition hover:bg-blue-50 active:bg-blue-100 sm:text-sm"
                >
                  <Camera size={16} className="text-[#5a67d8]" />
                  {t('frontName')}
                </button>
                {frontPhoto && (
                  <div className="relative mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={frontPhoto} alt="Front" className="h-40 w-full object-cover sm:h-48" />
                    <button
                      type="button"
                      onClick={() => removePhoto(setFrontPhoto)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Back Camera Button */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => triggerCamera(backCameraRef)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#dfe7f8] bg-white px-3 py-3 text-[0.76rem] font-medium text-slate-700 shadow-sm transition hover:bg-blue-50 active:bg-blue-100 sm:text-sm"
                >
                  <Camera size={16} className="text-[#5a67d8]" />
                  {t('backPrice')}
                </button>
                {backPhoto && (
                  <div className="relative mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={backPhoto} alt="Back" className="h-40 w-full object-cover sm:h-48" />
                    <button
                      type="button"
                      onClick={() => removePhoto(setBackPhoto)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden Camera Inputs */}
            <input
              ref={frontCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleCameraCapture(e, setFrontPhoto)}
              className="hidden"
            />
            <input
              ref={backCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleCameraCapture(e, setBackPhoto)}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExtractText}
              disabled={ocrStatus === 'loading' || ocrStatus === 'extracting' || (!frontPhoto && !backPhoto)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef3ff] px-4 py-3 text-sm font-semibold text-[#2d4db8] shadow-inner shadow-white/40 transition hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed sm:text-base"
            >
              {ocrStatus === 'loading' || ocrStatus === 'extracting' ? (
                <>
                  <Loader size={16} className="text-[#5d6ef0] animate-spin" />
                  {Math.round(ocrProgress * 100)}%
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-[#5d6ef0]" />
                  {t('extractText')}
                </>
              )}
            </button>

            {(ocrStatus === 'loading' || ocrStatus === 'extracting') && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-[#5d6ef0] transition-all duration-200"
                  style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                />
              </div>
            )}
          </section>

          {/* Form Fields Section */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('productName')}</label>
               <input
                 value={productName}
                 onChange={(e) => {
                   setProductName(e.target.value)
                   translateToTamil(e.target.value)
                 }}
                 placeholder={t('productName')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('tamilNameOptional')}</label>
               <input
                 value={tamilName}
                 onChange={(e) => {
                   setTamilName(e.target.value)
                   translateToEnglish(e.target.value)
                 }}
                 placeholder={t('tamilNameOptional')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('priceLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('priceLabel')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>
          </div>

          {/* Barcode Section */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={t('barcodeOptional')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>

            <button
              type="button"
              onClick={handleScan}
              className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 shadow-sm transition hover:bg-violet-100 active:bg-violet-200 sm:text-base"
            >
              <ScanLine size={16} className="text-violet-700" />
              {t('scan')}
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={saveProduct}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1fbf68] px-4 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(31,191,104,0.28)] transition hover:bg-[#18ab5b] active:bg-[#14943e] sm:py-5 sm:text-lg"
          >
            <Save size={18} />
            {t('saveProduct')}
          </button>

          {/* Bottom spacing for scrolling */}
          <div className="h-6"></div>
        </div>
      </main>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanSuccess}
      />
    </div>
  )
}
