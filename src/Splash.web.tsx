/*
 * Animate the static HTML splash (`#splash` in `web/index.html` and
 * `bskyweb/templates/base.html`) in place. Do not remount a second mark —
 * replacing the HTML Blue Notes logo with an inlined Bluesky butterfly is
 * what caused the mid-animation flip (#69).
 */

import {useEffect} from 'react'

export function Splash({
  isReady,
  children,
}: React.PropsWithChildren<{
  isReady: boolean
}>) {
  useEffect(() => {
    if (!isReady) return

    const splash = document.getElementById('splash')
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!splash || reduceMotion) {
      splash?.remove()
      return
    }

    /*
     * Keep the HTML splash above the mounting app, and match the previous
     * React overlay origin (the mark sits 50px above the viewport center).
     */
    splash.style.zIndex = '9999'
    splash.style.transformOrigin = 'center calc(50% - 50px)'

    const animation = splash.animate(
      [
        {opacity: 1, transform: 'scale(1)'},
        {opacity: 0, transform: 'scale(1.5)'},
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards',
      },
    )
    animation.onfinish = () => {
      splash.remove()
    }

    return () => {
      animation.cancel()
    }
  }, [isReady])

  return <>{isReady && children}</>
}
