export const VOICE_UNSUPPORTED = 'unsupported'
export const VOICE_INSECURE = 'insecure'
export const TAMIL_VOICE_LANGUAGE = 'ta-IN'
export const ENGLISH_VOICE_LANGUAGE = 'en-US'
export const VOICE_LANGUAGES = [TAMIL_VOICE_LANGUAGE, ENGLISH_VOICE_LANGUAGE]

const TAMIL_PHONETIC_VARIANTS = ['paal', 'pal', 'paul', 'pall', 'paal', 'பால்']
const VOICE_PRODUCT_MAP = {
  milk: 'MILK',
  pal: 'பால்',
  paal: 'பால்',
  paul: 'பால்',
  pall: 'பால்',
  'பால்': 'பால்',
}

export function mapVoiceProduct(text) {
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const match = Object.entries(VOICE_PRODUCT_MAP).find(([key]) => (
    words.includes(key) || normalized === key
  ))
  return match ? match[1] : String(text || '').trim()
}

export function mapTamilPhonetic(text) {
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  return TAMIL_PHONETIC_VARIANTS.some((variant) => words.includes(variant) || normalized === variant) ? 'பால்' : null
}

export function isTamilText(text) {
  return [...String(text || '')].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint >= 0x0B80 && codePoint <= 0x0BFF
  })
}

export function createBilingualRecognition(Ctor, { onResult, onError, onEnd }, languages = VOICE_LANGUAGES) {
  const recognitions = languages.map((lang) => {
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const resultIndex = event.resultIndex ?? event.results.length - 1
      const result = event.results?.[resultIndex]
      const transcript = mapVoiceProduct(result?.[0]?.transcript)
      if (transcript) onResult(transcript, Boolean(result?.isFinal), lang)
    }
    recognition.onerror = (event) => onError?.(event, lang)
    recognition.onend = () => onEnd?.(lang)
    return recognition
  })

  const started = recognitions.filter((recognition) => {
    try {
      recognition.start()
      return true
    } catch (_) {
      return false
    }
  })
  const ended = new Set()
  const finish = (lang) => {
    ended.add(lang)
    if (ended.size === started.length) onEnd?.()
  }
  started.forEach((recognition) => {
    const lang = recognition.lang
    recognition.onend = () => finish(lang)
  })

  return {
    recognitions: started,
    stop() {
      started.forEach((recognition) => {
        try { recognition.abort() } catch (_) {}
      })
    },
  }
}

export function isSecureContext() {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext === true) return true
  const host = window.location && window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return { ctor: null, reason: VOICE_UNSUPPORTED }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) return { ctor: null, reason: VOICE_UNSUPPORTED }
  if (!isSecureContext()) return { ctor: null, reason: VOICE_INSECURE }
  return { ctor: Ctor, reason: null }
}
