import React from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function SummaryPanel({ total = 0, onDelete, onPaySave }) {
  const { t } = useLanguage()
  const isEmpty = total <= 0

  return (
    <div className="bg-white rounded-t-3xl p-4 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">{t('total')}:</div>
        <div className="text-2xl font-bold">₹{total.toFixed(2)}</div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          className="flex min-w-0 flex-[0.9] items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-3 py-3 text-sm font-medium text-red-500 shadow-sm"
        >
          <Trash2 size={16} className="text-red-500" />
          <span>{t('delete')}</span>
        </button>

        <button
          type="button"
          onClick={isEmpty ? undefined : onPaySave}
          disabled={isEmpty}
          className={`flex min-w-0 flex-[1.8] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
            isEmpty
              ? 'cursor-not-allowed bg-[#eef0f2] text-gray-400'
              : 'bg-[#eef0f2] text-gray-700 shadow-sm'
          }`}
        >
          <Printer size={16} className={isEmpty ? 'text-gray-400' : 'text-gray-600'} />
          <span className="whitespace-nowrap">{t('paySave')}</span>
        </button>
      </div>
    </div>
  )
}
