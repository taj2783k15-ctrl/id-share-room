const APP_SOURCE = 'kosenjo-id-share-app'
const EXT_SOURCE = 'kosenjo-id-share-extension'

export function requestExtension(action, payload = {}, timeoutMs = 5000) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve({ ok: false, reason: 'extension-timeout' })
    }, timeoutMs)

    function onMessage(event) {
      if (event.source !== window || event.origin !== location.origin) return
      const message = event.data
      if (message?.source !== EXT_SOURCE || message?.type !== 'response' || message.requestId !== requestId) return
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(message)
    }

    window.addEventListener('message', onMessage)
    window.postMessage({ source: APP_SOURCE, type: 'request', requestId, action, ...payload }, location.origin)
  })
}

export function onExtensionEvent(callback) {
  function onMessage(event) {
    if (event.source !== window || event.origin !== location.origin) return
    const message = event.data
    if (message?.source !== EXT_SOURCE) return
    if (message.type === 'captured-id' || message.type === 'join-route-status') callback(message)
  }

  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}
