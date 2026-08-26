import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, PackagePlus, Check, Pencil } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function AddItem({ savedItems, setSavedItems, setCart }) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleAddToCart = (item) => {
    setCart((prev) => [...prev, item])
    navigate('/new-receipt')
  }

  const handleDeleteSaved = (id) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleEditSaved = (item) => {
    navigate('/add-product', { state: { editingProduct: item } })
  }

  const handleBack = () => {
    navigate('/new-receipt')
  }

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
          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-32 h-32 rounded-full bg-soft-purple/70 flex items-center justify-center mb-4 shadow-md">
                <PackagePlus size={40} className="text-purple-700" />
              </div>
              <p className="text-gray-400 text-lg">{t('productMgmtEmptyTitle')}</p>
              <p className="text-gray-400">{t('productMgmtEmptyTitle2')}</p>
              <p className="text-gray-400">{t('productMgmtEmptyTitle3')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedItems.map((item) => (
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
