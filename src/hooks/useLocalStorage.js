import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const next = value instanceof Function ? value(state) : value
      setState(next)
      localStorage.setItem(key, JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
  }

  return [state, setValue]
}
