import {useEffect} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {Trans} from '@lingui/react/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

/**
 * Fallback for /auth/web/callback. The OAuth redirect is completed in
 * App.web.tsx via BrowserOAuthClient.init() before navigation mounts.
 */
export function AuthCallback() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack()
      } else {
        navigation.reset({index: 0, routes: [{name: 'Home'}]})
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [navigation])

  return (
    <View
      style={[a.flex_1, a.align_center, a.justify_center, t.atoms.bg]}
      accessibilityLabel={_(msg`Completing sign-in`)}
      accessibilityHint={_(msg`Please wait while we finish signing you in`)}>
      <ActivityIndicator />
      <Text style={[a.mt_md, t.atoms.text_contrast_medium]}>
        <Trans>Completing sign-in…</Trans>
      </Text>
    </View>
  )
}
