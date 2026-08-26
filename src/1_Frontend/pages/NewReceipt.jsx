import React from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FloatingActions from '../components/FloatingActions'
import AddedItems from '../components/AddedItems'
import SummaryPanel from '../components/SummaryPanel'
import BarcodeScanner from '../components/BarcodeScanner'
import CustomerDetailsModal from '../components/CustomerDetailsModal'
import PrintableInvoice from '../components/PrintableInvoice'
import { useLanguage } from '../i18n'

const STORAGE_KEY = 'smartbiller_products'
const SAVED_RECEIPTS_KEY = 'saved_receipts'

const loadSavedProducts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load products from LocalStorage:', e)
  }
  return []
}

export default function NewReceipt({ cart, setCart, savedItems }) {
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [showScanner, setShowScanner] = React.useState(false)
  const [scanError, setScanError] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [toast, setToast] = React.useState('')
  const [lastCustomerDetails, setLastCustomerDetails] = React.useState({ customerName: '', phoneNumber: '' })
  const [printReceipt, setPrintReceipt] = React.useState(null)
  const [printReady, setPrintReady] = React.useState(false)
  const { language, setLanguage, t } = useLanguage()

  const total = React.useMemo(
    () => cart.reduce((sum, product) => sum + Number(product.price || 0) * (product.quantity || 1), 0),
    [cart]
  )

  const handleScan = () => {
    setScanError('')
    setShowScanner(true)
  }

  const speakProduct = (productName, currentLang = language) => {
    if (!('speechSynthesis' in window) || !productName) return;

    window.speechSynthesis.cancel();

    let textToSpeak = '';
    let langCode = 'en-US';

    if (currentLang === 'ta') {
      textToSpeak = `${productName} serkkappattathu`;
      langCode = 'en-IN';
    } else {
      textToSpeak = `${productName} added`;
      langCode = 'en-US';
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  const handleScanSuccess = (decodedText) => {
    const scannedBarcode = String(decodedText).trim()

    const matchedProduct = savedItems.find(
      (p) => String(p.barcode || '').trim() === scannedBarcode
    )

    if (matchedProduct) {
      const name = matchedProduct?.productName || matchedProduct?.name || "Unknown Product"

      if (name !== "Unknown Product") {
        speakProduct(name)
      } else {
        console.error("Product name not found in scan result")
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.id === matchedProduct.id)
        if (existing) {
          return prev.map((item) =>
            item.id === matchedProduct.id
              ? { ...item, quantity: (item.quantity || 1) + 1 }
              : item
          )
        }
        return [...prev, { ...matchedProduct, quantity: 1 }]
      })
      setScanError('')
      setShowScanner(false)
    } else {
      setScanError(t('productNotFound'))
      setShowScanner(false)
    }
  }

  const handleAddItem = () => {
    navigate('/add-item')
  }

  const handleDeleteItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateQuantity = (id, delta) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newQty = (item.quantity || 1) + delta
          return { ...item, quantity: newQty }
        }
        return item
      })
      return updated.filter((item) => (item.quantity || 1) > 0)
    })
  }

  const handleDeleteAll = () => {
    setCart([])
  }

  const handlePaySave = () => {
    if (cart.length === 0) return
    setIsModalOpen(true)
  }

  const saveReceiptToStorage = (customerDetails) => {
    const items = cart.map((item) => ({
      product_name: item.productName || item.name || 'Unknown',
      quantity: item.quantity || 1,
      price: Number(item.price || 0),
    }))

    const newReceipt = {
      id: 'REC-' + Date.now(),
      customerName: customerDetails.customerName,
      phoneNumber: customerDetails.phoneNumber,
      customer_name: customerDetails.customerName,
      phone_number: customerDetails.phoneNumber,
      items,
      totalAmount: total,
      total_amount: total,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    const existingReceipts = JSON.parse(localStorage.getItem(SAVED_RECEIPTS_KEY) || '[]')
    existingReceipts.unshift(newReceipt)
    localStorage.setItem(SAVED_RECEIPTS_KEY, JSON.stringify(existingReceipts))

    return newReceipt
  }

  const handleSaveOnly = (customerDetails) => {
    setLastCustomerDetails(customerDetails)
    try {
      saveReceiptToStorage(customerDetails)
      setCart([])
      setIsModalOpen(false)
      setToast(t('saveSuccess') || 'ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      console.error('Storage Error:', err)
      setToast('Failed to save receipt locally.')
      setTimeout(() => setToast(''), 3000)
    }
  }

  const handleSaveAndPrint = (customerDetails) => {
    const receipt = saveReceiptToStorage(customerDetails)
    setIsModalOpen(false)
    setPrintReceipt({
      customerName: receipt.customer_name || receipt.customerName,
      phoneNumber: receipt.phone_number || receipt.phoneNumber,
      date: receipt.created_at || receipt.date,
      items: cart.map((item) => ({
        name: item.productName || item.name || 'Unknown',
        quantity: item.quantity || 1,
        price: Number(item.price || 0),
      })),
      totalAmount: total,
    })
    setPrintReady(true)
  }

  React.useEffect(() => {
    if (printReady) {
      window.print()
      setCart([])
      setPrintReady(false)
    }
  }, [printReady])

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setPrintReceipt(null)
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header onAddItem={handleAddItem} onSettingsClick={() => setSettingsOpen(true)} onHistoryClick={() => navigate('/saved-receipts')} />

      <main className="flex-1 p-4">
        <AddedItems items={cart} onDelete={handleDeleteItem} onUpdateQuantity={handleUpdateQuantity} />
        <FloatingActions onScan={handleScan} onAdd={handleAddItem} />
      </main>

      <SummaryPanel total={total} onDelete={handleDeleteAll} onPaySave={handlePaySave} />

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{t('settingsTitle')}</h2>
              <button
                aria-label={t('close')}
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                {t('close')}
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">{t('language')}</div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-gray-800">{t('tamil')}</span>
                <input
                  type="radio"
                  name="language"
                  checked={language === 'ta'}
                  onChange={() => {
                    setLanguage('ta')
                    setSettingsOpen(false)
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-gray-800">{t('english')}</span>
                <input
                  type="radio"
                  name="language"
                  checked={language === 'en'}
                  onChange={() => {
                    setLanguage('en')
                    setSettingsOpen(false)
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false)
          setScanError('')
        }}
        onScan={handleScanSuccess}
      />

      <CustomerDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOnly}
        onSaveAndPrint={handleSaveAndPrint}
      />

      {scanError && !showScanner && (
        <div className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-white p-4 shadow-2xl border border-red-200">
          <p className="text-center text-sm font-semibold text-red-600">{scanError}</p>
          <p className="text-center text-xs text-gray-500 mt-1">{t('productNotFoundHint')}</p>
          <button
            type="button"
            onClick={() => {
              setScanError('')
              setShowScanner(true)
            }}
            className="mt-3 w-full rounded-xl bg-[#FF9E2C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Scan Again
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-[#1fbf68] p-4 shadow-2xl">
          <p className="text-center text-sm font-semibold text-white">{toast}</p>
        </div>
      )}

      <PrintableInvoice selectedReceipt={printReceipt} />
    </div>
  )
}
