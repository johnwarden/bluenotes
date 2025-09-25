import React, {useCallback, useEffect} from 'react'
import {
  AccessibilityInfo,
  Image as RNImage,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Svg, {Path, type SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

import {Logotype} from '#/view/icons/Logotype'
// @ts-ignore
import splashImagePointer from '../assets/splash.png'
// @ts-ignore
import darkSplashImagePointer from '../assets/splash-dark.png'
const splashImageUri = RNImage.resolveAssetSource(splashImagePointer).uri
const darkSplashImageUri = RNImage.resolveAssetSource(
  darkSplashImagePointer,
).uri

export const Logo = React.forwardRef(function LogoImpl(props: SvgProps, ref) {
  const width = 1000
  const height = width * 0.875443
  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 501.369 438.92"
      style={[{width, height}, props.style]}>
      <Path
        fill={props.fill || '#fff'}
        d="M189.026.943c-12 6-11 1-11 102 0 89 0 89-5 89-22-3-53-2-69 2-10 2-13 3-17 5-2 1-5 2-7 3-8 2-20 8-31 15-56 38-65 96-21 130 3 2 20 11 22 11 0 0 2 0 3 1 12 6 47 8 69 3 2 0 6-1 8-2 1 0 3-1 5-1 1 0 3-1 6-2 24-7 64-37 74-55 1-1 3-3 4-6 3-4 8-13 10-18 2-6 3-8 4-12 1-2 2-6 2-7 2-8 3-37 3-99 0-64 0-64 8-62 5 1 11 2 14 3s12 3 21 5c16 3 40 8 48 10 2 0 9 2 14 3s12 3 15 3c2 1 6 2 9 2 2 1 6 1 9 2 2 0 6 1 9 2 2 1 6 2 9 2 3 1 7 2 10 2 2 1 6 1 9 2 6 1 12 3 18 4 4 1 7 1 13 3 2 0 2 0 2 66s0 66-3 66c-1-1-6-2-10-3-15-3-45-2-61 3-3 1-7 2-8 2-8 2-17 5-24 8-4 2-7 4-8 4 0 0-2 1-4 3-3 2-5 3-5 3-5 0-33 26-40 37-15 21-18 50-8 70 3 6 17 22 19 22 1 0 2 1 4 2 5 3 23 11 29 12 3 1 7 2 8 2 4 1 43 1 48 0 2 0 6-1 10-2 54-11 94-49 106-102 3-13 3-257 0-263-5-9-14-16-25-18l-20-4c-7-1-14-3-21-4l-20-4c-2 0-7-1-10-2-8-1-14-2-20-4-6-1-14-3-19-4-9-2-20-4-30-6-6-1-12-3-20-4-3-1-7-1-9-2-3 0-9-2-15-3s-14-3-18-4c-5-1-11-2-15-3-7-1-13-2-20-4-3-1-7-1-9-2-3 0-8-1-10-2-6-1-27-1-29 0z"
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
  const [isAnimationComplete, setIsAnimationComplete] = React.useState(false)
  const [isImageLoaded, setIsImageLoaded] = React.useState(false)
  const [isLayoutReady, setIsLayoutReady] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState<boolean | undefined>(
    false,
  )
  const isReady =
    props.isReady &&
    isImageLoaded &&
    isLayoutReady &&
    reduceMotion !== undefined

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const logoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
        {
          scale: interpolate(
            outroLogo.get(),
            [0, 0.08, 1],
            [1, 0.8, 500],
            'clamp',
          ),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })
  const bottomLogoAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })
  const reducedLogoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const logoWrapperAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [1, 1, 0, 0],
        'clamp',
      ),
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
        [0, 0, 1, 1],
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
          intro.set(() =>
            withTiming(
              1,
              {duration: 400, easing: Easing.out(Easing.cubic)},
              async () => {
                // set these values to check animation at specific point
                outroLogo.set(() =>
                  withTiming(
                    1,
                    {duration: 1200, easing: Easing.in(Easing.cubic)},
                    () => {
                      runOnJS(onFinish)()
                    },
                  ),
                )
                outroApp.set(() =>
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.inOut(Easing.cubic),
                  }),
                )
                outroAppOpacity.set(() =>
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

  const logoAnimations =
    reduceMotion === true ? reducedLogoAnimation : logoAnimation
  // special off-spec color for dark mode
  const logoBg = isDarkMode ? '#0F1824' : '#fff'

  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      {!isAnimationComplete && (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            accessibilityIgnoresInvertColors
            onLoadEnd={onLoadEnd}
            source={{uri: isDarkMode ? darkSplashImageUri : splashImageUri}}
            style={StyleSheet.absoluteFillObject}
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
                StyleSheet.absoluteFillObject,
                logoWrapperAnimation,
                {
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: [{translateY: -(insets.top / 2)}, {scale: 0.1}], // scale from 1000px to 100px
                },
              ]}>
              <Animated.View style={[logoAnimations]}>
                <Logo fill={logoBg} />
              </Animated.View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}
