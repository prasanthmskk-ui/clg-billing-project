import React from 'react'
import { Plus, ScanLine } from 'lucide-react'

export default function FloatingActions({ onScan, onAdd }) {
  const actionButtonClass =
    'w-[68px] h-[68px] rounded-[18px] shadow-[0_8px_18px_rgba(46,22,93,0.22)] flex items-center justify-center text-[#2E1A52]'

  return (
    <div className="fixed right-4 bottom-28 z-20 flex flex-col items-center gap-3">
      <button
        onClick={onScan}
        aria-label="scan"
        className={`${actionButtonClass} bg-[#FF9E2C]`}
      >
        <ScanLine size={30} strokeWidth={2.2} />
      </button>

      <button
        onClick={onAdd}
        aria-label="add item"
        className={`${actionButtonClass} bg-[#2BCB7B]`}
      >
        <Plus size={34} strokeWidth={2.8} />
      </button>
    </div>
  )
}
