// Offline-first Tesseract worker engine.
//
// The single most important speed fix: we create ONE worker for the whole app
// and reuse it for every scan. createWorker() is expensive because it spins up
// a Web Worker, loads the WASM core and downloads the language data. Doing that
// on every photo is what made the old code slow. Here the worker is a module
// singleton and the language pack is loaded once and cached locally + by the
// service worker, so after the first load there are ZERO network requests.

import { createWorker, OEM } from 'tesseract.js'

// Language data is served from our own origin (public/tessdata) instead of the
// Tesseract CDN. The .gz files are cached by the service worker for offline use.
const LANG_PATH = '/tessdata'

// Whitelists: restricting the character set is a huge recognition speed-up and
// also cuts OCR noise. English-only (no Tamil model) keeps the download tiny.
export const WHITELIST = {
  name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-&/\'',
  price: '0123456789.,/:Rs',
}

let workerPromise = null
let progressHandler = null

function handleProgress(m) {
  if (typeof progressHandler === 'function' && m && typeof m.progress === 'number') {
    progressHandler(m)
  }
}

/**
 * Returns the shared worker instance, creating it lazily on first use.
 * @param {(m:any)=>void} [onProgress]
 */
export function getOcrWorker(onProgress) {
  if (onProgress) progressHandler = onProgress
  if (!workerPromise) {
    workerPromise = createWorker('eng', OEM.LSTM_ONLY, {
      langPath: LANG_PATH,
      gzip: true,
      cacheMethod: 'refresh',
      logger: handleProgress,
    }, {
      tessedit_pageseg_mode: '6', // Assume a single uniform block of text.
    })
  }
  return workerPromise
}

/** Pre-load the worker + language data once (call on app start for instant scans). */
export async function warmupOcrWorker(onProgress) {
  await getOcrWorker(onProgress)
}

export function setOcrProgressHandler(fn) {
  progressHandler = fn
}

/**
 * Run OCR on a preprocessed image/canvas.
 * @param {any} image preprocessed canvas/blob/dataURL
 * @param {object} [opts]
 * @param {'name'|'price'|string} [opts.whitelist] preset key or explicit string
 * @param {number} [opts.psm] page segmentation mode
 */
export async function recognizeText(image, opts = {}) {
  const whitelist =
    typeof opts.whitelist === 'string' && WHITELIST[opts.whitelist]
      ? WHITELIST[opts.whitelist]
      : opts.whitelist || WHITELIST.name

  try {
    const worker = await getOcrWorker()
    const { data } = await worker.recognize(image, {
      tessedit_char_whitelist: whitelist,
      ...(opts.psm != null ? { tessedit_pageseg_mode: opts.psm } : {}),
    }, { text: true, blocks: false, hocr: false, tsv: false })
    return data
  } catch (err) {
    // OCR must never hard-fail the scan. Reset the (possibly dead) worker so
    // the next call rebuilds it, then return an empty-safe result so callers
    // can apply their own raw-text fallback.
    console.error('OCR recognize failed:', err)
    await resetOcrWorker().catch(() => {})
    return { text: '', confidence: 0 }
  }
}

/** Force a fresh worker (e.g. after a fatal error) so the next call rebuilds it. */
export async function resetOcrWorker() {
  if (workerPromise) {
    try {
      const w = await workerPromise
      await w.terminate()
    } catch {
      /* noop */
    }
  }
  workerPromise = null
}
