import React from 'react'
import { Settings, Clock, PackagePlus } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function Header({ onSettingsClick, onAddItem, onHistoryClick }) {
  const { t } = useLanguage()

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-transparent">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">{t('newReceipt')}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Add Item"
          title="Add Item"
          onClick={onAddItem}
          className="p-2 rounded-lg bg-white/60 shadow-sm transition-colors hover:bg-white/80 active:bg-white/90"
        >
          <PackagePlus size={18} strokeWidth={2} />
        </button>

        <button aria-label={t('history')} title={t('history')} onClick={onHistoryClick} className="p-2 rounded-lg bg-white/60 shadow-sm">
          <Clock size={18} />
        </button>

        <button aria-label={t('settings')} title={t('settings')} onClick={onSettingsClick} className="p-2 rounded-lg bg-white/60 shadow-sm">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
