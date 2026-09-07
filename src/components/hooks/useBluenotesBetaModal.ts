import {useEffect, useState} from 'react'

import {isWeb} from '#/platform/detection'
import {useSession} from '#/state/session'

export function useBluenotesBetaModal() {
  const {hasSession} = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => {
    setIsOpen(false)
    // Mark that user has seen the modal in this session, don't show again this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bluenotesBetaModalSeen', 'true')
    }
  }

  useEffect(() => {
    // Only show modal if:
    // 1. User is not logged in
    // 2. We're on the web (this is a web-only feature)
    // 3. User hasn't seen the modal in this session
    if (isWeb && !hasSession && typeof window !== 'undefined') {
      const hasUserSeenModal =
        sessionStorage.getItem('bluenotesBetaModalSeen') === 'true'

      if (!hasUserSeenModal) {
        // Small delay to ensure the page has loaded
        const timer = setTimeout(() => {
          open()
        }, 1000)

        return () => clearTimeout(timer)
      }
    }
  }, [hasSession])

  return {isOpen, open, close}
}
