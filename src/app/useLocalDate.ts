import { useEffect, useState } from 'react'
import { localDateKey, millisecondsUntilTomorrow } from '../lib/dates/calendar'
export function useLocalDate() {
  const [today, setToday] = useState(() => localDateKey(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      setToday(localDateKey(now))
      timer = setTimeout(refresh, millisecondsUntilTomorrow(now))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
