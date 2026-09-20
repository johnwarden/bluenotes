/*
 * This is a reimplementation of what exists in our HTML template files
 * already. Once the React tree mounts, this is what gets rendered first, until
 * the app is ready to go.
 */

import {useEffect, useRef, useState} from 'react'
import Svg, {Path} from 'react-native-svg'

import {atoms as a, flattenToCSS} from '#/alf'

const size = 100
const ratio = 441 / 500
/**
 * Must match the static HTML splash in `web/index.html` and
 * `bskyweb/templates/base.html` so React takeover does not flash a different mark.
 */
const BLUE_NOTES_MARK =
  'M187 4c-2 1-5 4-6 6-4 6-4 17-4 119 0 65 0 65-4 65-17-3-41-3-59 0-9 1-18 4-27 7-4 1-8 3-9 3-6 2-20 9-29 16-19 12-40 36-44 50-5 17-7 31-4 40 8 24 24 41 46 49 2 1 4 2 6 2 9 4 21 5 40 5 20 1 24 0 42-5 45-13 87-53 98-94 0-2 1-6 2-8 2-6 3-89 2-130 0-31 0-31 4-30 2 1 6 2 9 2 3 1 7 2 10 2 7 1 20 4 30 7 6 1 13 3 16 3 6 1 12 3 17 4 3 0 7 1 11 2 3 1 7 2 9 2 1 0 5 1 9 2 3 1 7 1 9 2 1 0 5 1 9 2s8 2 11 2c7 2 10 3 17 4 3 1 7 2 9 2 2 1 5 1 7 1 3 1 11 3 17 4 2 1 7 1 9 2 5 0 5 0 5 67 0 66 0 66-3 66-1-1-6-2-10-3-14-2-46-2-58 2-2 0-6 1-8 2s-8 2-11 4c-4 1-8 2-9 3-2 0-7 2-11 5-52 26-78 73-62 110 9 21 28 34 60 42 6 1 43 1 49 0 3 0 7-1 10-2 47-9 87-44 101-85 7-21 7-11 7-151 0-124 0-125-2-129-5-9-14-16-25-18-3-1-7-1-9-2-3-1-8-1-11-2-9-2-14-3-21-4-10-2-14-3-20-4-14-3-25-5-30-6s-9-2-19-4c-3-1-8-1-10-2-2 0-7-1-10-2s-7-1-9-2c-4-1-6-1-15-3-8-1-22-4-39-8-8-2-16-3-17-4-4 0-32-6-41-8-11-2-31-2-35 0z'

export function Splash({
  isReady,
  children,
}: React.PropsWithChildren<{
  isReady: boolean
}>) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const splashRef = useRef<HTMLDivElement>(null)

  // hide the static one that's baked into the HTML - gets replaced by our React version below
  useEffect(() => {
    // double rAF ensures that the React version gets painted first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const splash = document.getElementById('splash')
        if (splash) {
          splash.remove()
        }
      })
    })
  }, [])

  // when ready, we fade/scale out
  useEffect(() => {
    if (!isReady) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const node = splashRef.current
    if (!node || reduceMotion) {
      setIsAnimationComplete(true)
      return
    }

    const animation = node.animate(
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
    animation.onfinish = () => setIsAnimationComplete(true)

    return () => {
      animation.cancel()
    }
  }, [isReady])

  return (
    <>
      {isReady && children}

      {!isAnimationComplete && (
        <div
          ref={splashRef}
          style={flattenToCSS([
            a.fixed,
            a.inset_0,
            a.flex,
            a.align_center,
            a.justify_center,
            // to compensate for the `top: -50px` below
            {transformOrigin: 'center calc(50% - 50px)'},
          ])}>
          <Svg
            fill="none"
            viewBox="0 0 500 441"
            style={[a.relative, {width: size, height: size * ratio, top: -50}]}>
            <Path fill="#1185FE" d={BLUE_NOTES_MARK} />
          </Svg>
        </div>
      )}
    </>
  )
}
