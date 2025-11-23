"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface UseInactivityTimeoutOptions {
  timeoutMs: number // Tempo até logout em ms
  warningMs: number // Tempo para mostrar aviso antes do logout
  onTimeout: () => void
  enabled?: boolean
}

export function useInactivityTimeout({
  timeoutMs,
  warningMs,
  onTimeout,
  enabled = true,
}: UseInactivityTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(warningMs)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
      warningRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const resetTimers = useCallback(() => {
    if (!enabled) return

    clearAllTimers()
    setShowWarning(false)
    setRemainingTime(warningMs)
    lastActivityRef.current = Date.now()

    // Timer para mostrar aviso
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setRemainingTime(warningMs)

      // Inicia countdown
      countdownRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = prev - 1000
          if (newTime <= 0) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return newTime
        })
      }, 1000)
    }, timeoutMs - warningMs)

    // Timer para logout
    timeoutRef.current = setTimeout(() => {
      onTimeout()
    }, timeoutMs)
  }, [enabled, timeoutMs, warningMs, onTimeout, clearAllTimers])

  const handleActivity = useCallback(() => {
    // Evita resetar muito frequentemente (debounce de 1s)
    const now = Date.now()
    if (now - lastActivityRef.current < 1000) return

    resetTimers()
  }, [resetTimers])

  const extendSession = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    if (!enabled) {
      clearAllTimers()
      setShowWarning(false)
      return
    }

    // Eventos que indicam atividade do usuário
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ]

    // Inicializa os timers
    resetTimers()

    // Adiciona listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Também detecta atividade em outras abas via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "last_activity") {
        handleActivity()
      }
    }
    window.addEventListener("storage", handleStorage)

    // Atualiza storage para sincronizar entre abas
    const updateStorage = () => {
      localStorage.setItem("last_activity", Date.now().toString())
    }
    events.forEach((event) => {
      window.addEventListener(event, updateStorage, { passive: true })
    })

    return () => {
      clearAllTimers()
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
        window.removeEventListener(event, updateStorage)
      })
      window.removeEventListener("storage", handleStorage)
    }
  }, [enabled, resetTimers, handleActivity, clearAllTimers])

  return {
    showWarning,
    remainingTime,
    extendSession,
  }
}
