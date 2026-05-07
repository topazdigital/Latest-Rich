import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from './useAuth'

type WSMessage = {
  type: string
  [key: string]: any
}

type WSHandler = (msg: WSMessage) => void

const BASE_WS_URL = (() => {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
  const apiBase = base + '/api'
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProto}//${window.location.host}${apiBase.replace('/api', '')}/ws`
})()

let sharedWS: WebSocket | null = null
let sharedToken: string | null = null
const globalHandlers = new Map<string, Set<WSHandler>>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

function connectWS(token: string) {
  if (sharedWS && sharedWS.readyState === WebSocket.OPEN && sharedToken === token) return
  if (sharedWS) {
    sharedWS.onclose = null
    sharedWS.close()
    sharedWS = null
  }

  sharedToken = token
  const wsUrl = `${BASE_WS_URL}?token=${encodeURIComponent(token)}`

  try {
    sharedWS = new WebSocket(wsUrl)
  } catch {
    scheduleReconnect(token)
    return
  }

  sharedWS.onopen = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (pingInterval) clearInterval(pingInterval)
    pingInterval = setInterval(() => {
      if (sharedWS?.readyState === WebSocket.OPEN) {
        sharedWS.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
    emit({ type: '__connected' })
  }

  sharedWS.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      emit(msg)
    } catch {}
  }

  sharedWS.onclose = () => {
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
    emit({ type: '__disconnected' })
    if (sharedToken) scheduleReconnect(sharedToken)
  }

  sharedWS.onerror = () => {
    sharedWS?.close()
  }
}

function scheduleReconnect(token: string) {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectWS(token)
  }, 3000)
}

function emit(msg: WSMessage) {
  const handlers = globalHandlers.get(msg.type)
  if (handlers) handlers.forEach(h => h(msg))
  const all = globalHandlers.get('*')
  if (all) all.forEach(h => h(msg))
}

function sendWS(data: object) {
  if (sharedWS?.readyState === WebSocket.OPEN) {
    sharedWS.send(JSON.stringify(data))
    return true
  }
  return false
}

function disconnectWS() {
  sharedToken = null
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (sharedWS) {
    sharedWS.onclose = null
    sharedWS.close()
    sharedWS = null
  }
}

export function useWebSocket() {
  const { token } = useAuth()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) { disconnectWS(); return }
    connectWS(token)

    const onConn = () => setConnected(true)
    const onDisconn = () => setConnected(false)

    if (!globalHandlers.has('__connected')) globalHandlers.set('__connected', new Set())
    if (!globalHandlers.has('__disconnected')) globalHandlers.set('__disconnected', new Set())
    globalHandlers.get('__connected')!.add(onConn)
    globalHandlers.get('__disconnected')!.add(onDisconn)

    // Check current state
    setConnected(sharedWS?.readyState === WebSocket.OPEN)

    return () => {
      globalHandlers.get('__connected')?.delete(onConn)
      globalHandlers.get('__disconnected')?.delete(onDisconn)
    }
  }, [token])

  const on = useCallback((type: string, handler: WSHandler) => {
    if (!globalHandlers.has(type)) globalHandlers.set(type, new Set())
    globalHandlers.get(type)!.add(handler)
    return () => { globalHandlers.get(type)?.delete(handler) }
  }, [])

  const send = useCallback((data: object) => sendWS(data), [])

  return { connected, on, send }
}

export function useWSEvent(type: string, handler: WSHandler, deps: any[] = []) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const h: WSHandler = (msg) => handlerRef.current(msg)
    if (!globalHandlers.has(type)) globalHandlers.set(type, new Set())
    globalHandlers.get(type)!.add(h)
    return () => { globalHandlers.get(type)?.delete(h) }
  }, [type, ...deps])
}

export { sendWS }
