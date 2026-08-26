import React from 'react'
import { Trash2, Receipt } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function AddedItems({ items, onDelete, onUpdateQuantity }) {
  const { t } = useLanguage()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-32 h-32 rounded-full bg-soft-purple/70 flex items-center justify-center mb-4 shadow-md">
          <Receipt size={40} className="text-purple-700" />
        </div>
        <p className="text-gray-400 text-lg">{t('noItems')}</p>
        <p className="text-gray-400">{t('tapAdd')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide truncate">
                {item.productName}
              </h3>
              {item.tamilName && (
                <p className="text-sm text-slate-500 truncate mt-0.5">{item.tamilName}</p>
              )}
              {item.barcode && (
                <p className="text-xs text-slate-400 mt-0.5">#{item.barcode}</p>
              )}
              <p className="text-sm text-slate-500 mt-1">
                Unit Price: ₹{Number(item.price).toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-6 sm:w-8 text-center font-bold text-base sm:text-lg text-slate-900">
                  {item.quantity || 1}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap">
                ₹{Number(item.price * (item.quantity || 1)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label={t('delete')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
