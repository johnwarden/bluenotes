import {forwardRef, useCallback, useEffect, useState} from 'react'
import {
  AccessibilityInfo,
  Image as RNImage,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Svg, {Path, type SvgProps} from 'react-native-svg'
import {scheduleOnRN} from 'react-native-worklets'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

import {Logotype} from '#/view/icons/Logotype'
import {atoms as a} from '#/alf'
// @ts-expect-error
import splashImagePointer from '../assets/splash/splash.png'
// @ts-expect-error
import darkSplashImagePointer from '../assets/splash/splash-dark.png'

const splashImageUri = RNImage.resolveAssetSource(splashImagePointer)!.uri
const darkSplashImageUri = RNImage.resolveAssetSource(
  darkSplashImagePointer,
)!.uri

export const Logo = forwardRef(function LogoImpl(props: SvgProps, ref) {
  const width = 1000
  const height = width * 0.882
  return (
    <Svg
      fill="none"
      // @ts-expect-error it's fiiiiine
      ref={ref}
      viewBox="0 0 500 441"
      style={[{width, height}, props.style]}>
      <Path
        fill={props.fill || '#fff'}
        d="M187 4c-2 1-5 4-6 6-4 6-4 17-4 119 0 65 0 65-4 65-17-3-41-3-59 0-9 1-18 4-27 7-4 1-8 3-9 3-6 2-20 9-29 16-19 12-40 36-44 50-5 17-7 31-4 40 8 24 24 41 46 49 2 1 4 2 6 2 9 4 21 5 40 5 20 1 24 0 42-5 45-13 87-53 98-94 0-2 1-6 2-8 2-6 3-89 2-130 0-31 0-31 4-30 2 1 6 2 9 2 3 1 7 2 10 2 7 1 20 4 30 7 6 1 13 3 16 3 6 1 12 3 17 4 3 0 7 1 11 2 3 1 7 2 9 2 1 0 5 1 9 2 3 1 7 1 9 2 1 0 5 1 9 2s8 2 11 2c7 2 10 3 17 4 3 1 7 2 9 2 2 1 5 1 7 1 3 1 11 3 17 4 2 1 7 1 9 2 5 0 5 0 5 67 0 66 0 66-3 66-1-1-6-2-10-3-14-2-46-2-58 2-2 0-6 1-8 2s-8 2-11 4c-4 1-8 2-9 3-2 0-7 2-11 5-52 26-78 73-62 110 9 21 28 34 60 42 6 1 43 1 49 0 3 0 7-1 10-2 47-9 87-44 101-85 7-21 7-11 7-151 0-124 0-125-2-129-5-9-14-16-25-18-3-1-7-1-9-2-3-1-8-1-11-2-9-2-14-3-21-4-10-2-14-3-20-4-14-3-25-5-30-6s-9-2-19-4c-3-1-8-1-10-2-2 0-7-1-10-2s-7-1-9-2c-4-1-6-1-15-3-8-1-22-4-39-8-8-2-16-3-17-4-4 0-32-6-41-8-11-2-31-2-35 0z"
      />
    </Svg>
  )
})

type Props = {
  isReady: boolean
}

export function Splash(props: React.PropsWithChildren<Props>) {
  'use no memo'
  const insets = useSafeAreaInsets()
  const intro = useSharedValue(0)
  const outroLogo = useSharedValue(0)
  const outroApp = useSharedValue(0)
  const outroAppOpacity = useSharedValue(0)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>(false)
  const isReady =
    props.isReady &&
    isImageLoaded &&
    isLayoutReady &&
    reduceMotion !== undefined

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const logoAnimation = useAnimatedStyle(() => {
    const introScale = interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp')
    const outroScale =
      reduceMotion === true
        ? 1
        : interpolate(outroLogo.get(), [0, 0.08, 1], [1, 0.8, 500], 'clamp')

    const introOpacity = interpolate(intro.get(), [0, 1], [0, 1], 'clamp')
    const outroOpacity = interpolate(
      outroAppOpacity.get(),
      [0, 0.1, 0.2, 1],
      [1, 1, 0, 0],
      'clamp',
    )

    return {
      opacity: introOpacity * outroOpacity,
      transform: [
        {translateY: -(insets.top / 2)},
        {scale: 0.1 * outroScale * introScale},
      ],
    }
  })
  const bottomLogoAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const appAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(outroApp.get(), [0, 1], [1.1, 1], 'clamp'),
        },
      ],
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [0.02, 0.02, 1, 1], // first two values cant be 0 for the iOS blur/glass effects to work, the values obtained by trial and error
        'clamp',
      ),
    }
  })

  const onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])
  const onLoadEnd = useCallback(() => setIsImageLoaded(true), [])

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync()
        .then(() => {
          intro.set(
            withTiming(
              1,
              {duration: 400, easing: Easing.out(Easing.cubic)},
              () => {
                'worklet'
                // set these values to check animation at specific point
                outroLogo.set(
                  withTiming(
                    1,
                    {duration: 1200, easing: Easing.in(Easing.cubic)},
                    () => {
                      scheduleOnRN(onFinish)
                    },
                  ),
                )
                outroApp.set(
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.inOut(Easing.cubic),
                  }),
                )
                outroAppOpacity.set(
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.in(Easing.cubic),
                  }),
                )
              },
            ),
          )
        })
        .catch(() => {})
    }
  }, [onFinish, intro, outroLogo, outroApp, outroAppOpacity, isReady])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
  }, [])

  // special off-spec color for dark mode
  const logoBg = isDarkMode ? '#0F1824' : '#fff'

  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      {!isAnimationComplete && (
        <View style={[a.absolute, a.inset_0]}>
          <Image
            accessibilityIgnoresInvertColors
            onLoadEnd={onLoadEnd}
            source={{uri: isDarkMode ? darkSplashImageUri : splashImageUri}}
            style={[a.absolute, a.inset_0]}
          />

          <Animated.View
            style={[
              bottomLogoAnimation,
              {
                position: 'absolute',
                bottom: insets.bottom + 40,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
              },
            ]}>
            <Logotype fill="#fff" width={90} />
          </Animated.View>
        </View>
      )}

      {isReady && (
        <>
          <Animated.View style={[{flex: 1}, appAnimation]}>
            {props.children}
          </Animated.View>

          {!isAnimationComplete && (
            <Animated.View
              style={[
                a.absolute,
                a.inset_0,
                logoAnimation,
                {
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}>
              <Logo fill={logoBg} />
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}
