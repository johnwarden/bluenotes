import {useEffect, useMemo, useRef} from 'react'
import {WebView, type WebViewNavigation} from 'react-native-webview'
import {type ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes'

import {type SignupState} from '#/screens/Signup/state'

const ALLOWED_HOSTS = [
  'bsky.social',
  'bsky.app',
  'staging.bsky.app',
  'staging.bsky.dev',
  'app.staging.bsky.dev',
  'js.hcaptcha.com',
  'newassets.hcaptcha.com',
  'api2.hcaptcha.com',
  'localhost',
  '127.0.0.1',
  'bluenotes.social',
]

const MIN_DELAY = 3_500

export function CaptchaWebView({
  url,
  stateParam,
  state,
  onSuccess,
  onError,
}: {
  url: string
  stateParam: string
  state?: SignupState
  onSuccess: (code: string) => void
  onError: (error: unknown) => void
}) {
  const startedAt = useRef(Date.now())
  const successTo = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    return () => {
      if (successTo.current) {
        clearTimeout(successTo.current)
      }
    }
  }, [])

  const redirectHost = useMemo(() => {
    if (!state?.serviceUrl) return 'bsky.app'

    // In development, expect redirects to localhost:19006 (React Native app)
    if (__DEV__) {
      return 'localhost:19006'
    }

    // In production, redirects should come to the current service host
    // The bskyweb proxy rewrites bsky.app redirects to the current host
    const serviceHost = new URL(state.serviceUrl).host
    if (serviceHost === 'staging.bsky.dev') {
      return 'app.staging.bsky.dev'
    }

    // For custom hosts like bluenotes.social, expect redirects to the same host
    return serviceHost
  }, [state?.serviceUrl])

  const wasSuccessful = useRef(false)

  const onShouldStartLoadWithRequest = (event: ShouldStartLoadRequest) => {
    const urlp = new URL(event.url)
    return ALLOWED_HOSTS.includes(urlp.host)
  }

  const onNavigationStateChange = (e: WebViewNavigation) => {
    if (wasSuccessful.current) return

    const urlp = new URL(e.url)
    if (urlp.host !== redirectHost || urlp.pathname === '/gate/signup') return

    const code = urlp.searchParams.get('code')
    if (urlp.searchParams.get('state') !== stateParam || !code) {
      onError({error: 'Invalid state or code'})
      return
    }

    // We want to delay the completion of this screen ever so slightly so that it doesn't appear to be a glitch if it completes too fast
    wasSuccessful.current = true
    const now = Date.now()
    const timeTaken = now - startedAt.current
    if (timeTaken < MIN_DELAY) {
      successTo.current = setTimeout(() => {
        onSuccess(code)
      }, MIN_DELAY - timeTaken)
    } else {
      onSuccess(code)
    }
  }

  return (
    <WebView
      source={{uri: url}}
      javaScriptEnabled
      style={{
        flex: 1,
        backgroundColor: 'transparent',
        borderRadius: 10,
      }}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onNavigationStateChange={onNavigationStateChange}
      scrollEnabled={false}
      onError={e => {
        onError(e.nativeEvent)
      }}
      onHttpError={e => {
        onError(e.nativeEvent)
      }}
    />
  )
}
