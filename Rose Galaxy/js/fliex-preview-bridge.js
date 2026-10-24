/* Fliex iframe integration only. Standalone Rose Galaxy behavior is unchanged. */
(() => {
  'use strict'
  if (window.parent === window) return
  const query = new URL(location.href).searchParams
  const token = query.get('fliex-preview') || ''
  let parentOrigin
  try {
    const parent = new URL(query.get('fliex-parent') || '')
    if (parent.origin !== 'https://novafliex.github.io' && !(parent.protocol === 'http:' && ['127.0.0.1','localhost'].includes(parent.hostname))) return
    parentOrigin = parent.origin
  } catch { return }
  if (!/^[a-f0-9-]{32,64}$/i.test(token)) return
  const send = (type, detail = {}) => window.parent.postMessage({channel:'fliex-preview',token,type,...detail},parentOrigin)
  const missing = new Set()
  window.addEventListener('error', event => {
    const target = event.target
    if (target instanceof HTMLImageElement || target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
      const url = target.src || target.href
      if (url) missing.add(url)
      send('resource-error')
    }
  },true)
  window.addEventListener('keydown',event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    send('escape')
  },true)
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    const canvas = document.getElementById('hero-galaxy-canvas')
    const images = [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => image.src)
    send('ready',{title:document.title,canvasReady:Boolean(canvas && canvas.width && canvas.height),missingResources:[...new Set([...missing,...images])]})
  }))
  if (document.readyState === 'complete') ready()
  else window.addEventListener('load',ready,{once:true})
})()
