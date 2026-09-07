const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response
}

export function getLocalStorageReceipts() {
  try {
    const stored = localStorage.getItem('saved_receipts')
    const data = stored ? JSON.parse(stored) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
