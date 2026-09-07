import '#/lib/oauth/callback-snapshot'
import '#/logger/sentry/setup' // must be near top
import './style.css'

import {Fragment, useEffect, useState} from 'react'
import {KeyboardProvider as KeyboardControllerProvider} from 'react-native-keyboard-controller'
import {SafeAreaProvider} from 'react-native-safe-area-context'
import {useLingui} from '@lingui/react/macro'
import * as Sentry from '@sentry/react-native'

import {Provider as HotkeysProvider} from '#/lib/hotkeys'
import {shouldEstablishAppSessionFromOauthInit} from '#/lib/oauth/loopback-callback'
import {
  decideOauthLoginEstablishedAfterPeek,
  describeOauthInitResult,
  leftoverGrantBlocksSoftGatePass,
  OAUTH_BREADCRUMB,
  oauthConsoleBreadcrumb,
  shouldEmitOauthLoginEstablishedBreadcrumb,
  shouldPaintAppAfterOauthLaunch,
  wrapBootstrapOauthInit,
} from '#/lib/oauth/oauth-init-policy'
import {QueryProvider} from '#/lib/react-query'
import {ThemeProvider} from '#/lib/ThemeContext'
import {Provider as TranslateOnDeviceProvider} from '#/lib/translation'
import I18nProvider from '#/locale/i18nProvider'
import {logger} from '#/logger'
import {Provider as A11yProvider} from '#/state/a11y'
import {
  prefetchAppConfig,
  Provider as AppConfigProvider,
} from '#/state/appConfig'
import {Provider as MutedThreadsProvider} from '#/state/cache/thread-mutes'
import {Provider as DialogStateProvider} from '#/state/dialogs'
import {Provider as EmailVerificationProvider} from '#/state/email-verification'
import {listenSessionDropped} from '#/state/events'
import {Provider as HomeBadgeProvider} from '#/state/home-badge'
import {MessagesProvider} from '#/state/messages'
import {init as initPersistedState} from '#/state/persisted'
import {Provider as PrefsStateProvider} from '#/state/preferences'
import {BetaUserStorageSync} from '#/state/preferences/beta-user-sync'
import {Provider as LabelDefsProvider} from '#/state/preferences/label-defs'
import {Provider as ModerationOptsProvider} from '#/state/preferences/moderation-opts'
import {Provider as UnreadNotifsProvider} from '#/state/queries/notifications/unread'
import {Provider as ServiceConfigProvider} from '#/state/service-config'
import {
  Provider as SessionProvider,
  type SessionAccount,
  useSession,
  useSessionApi,
} from '#/state/session'
import {
  clearOauthCallbackUrl,
  hasLeftoverOauthGrantInUrl,
  hasPendingOauthCallback,
  initOAuthClient,
  peekLastOauthInitError,
  peekLeftoverOauthGrantKeys,
  peekOauthSessionAlive,
  reportOauthFailureDiagnosis,
  shouldReportSilentAnonymousPaint,
} from '#/state/session/oauth-client'
import {readLastActiveAccount} from '#/state/session/util'
import {Provider as ShellStateProvider} from '#/state/shell'
import {Provider as ComposerProvider} from '#/state/shell/composer'
import {Provider as LandingProvider} from '#/state/shell/landing'
import {Provider as LoggedOutViewProvider} from '#/state/shell/logged-out'
import {Provider as OnboardingProvider} from '#/state/shell/onboarding'
import {Provider as ProgressGuideProvider} from '#/state/shell/progress-guide'
import {Provider as SelectedFeedProvider} from '#/state/shell/selected-feed'
import {Provider as HiddenRepliesProvider} from '#/state/threadgate-hidden-replies'
import {Shell} from '#/view/shell/index'
import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {Provider as ContextMenuProvider} from '#/components/ContextMenu'
import {useLandingEntry} from '#/components/hooks/useLandingEntry'
import {Provider as IntentDialogProvider} from '#/components/intents/IntentDialogs'
import {Provider as LightboxStateProvider} from '#/components/Lightbox/state'
import {Provider as PolicyUpdateOverlayProvider} from '#/components/PolicyUpdateOverlay'
import {Provider as PortalProvider} from '#/components/Portal'
import {Provider as ActiveVideoProvider} from '#/components/Post/Embed/VideoEmbed/ActiveVideoWebContext'
import {Provider as VideoVolumeProvider} from '#/components/Post/Embed/VideoEmbed/VideoVolumeContext'
import * as Toast from '#/components/Toast'
import {ToastOutlet} from '#/components/Toast'
import {
  prefetchAgeAssuranceConfig,
  Provider as AgeAssuranceV2Provider,
} from '#/ageAssurance'
import {
  AnalyticsContext,
  AnalyticsFeaturesContext,
  features,
  setupDeviceId,
} from '#/analytics'
import {
  prefetchLiveEvents,
  Provider as LiveEventsProvider,
} from '#/features/liveEvents/context'
import * as Geo from '#/geolocation'
import {Splash} from '#/Splash'
import {BackgroundNotificationPreferencesProvider} from '../modules/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'
import {Provider as HideBottomBarBorderProvider} from './lib/hooks/useHideBottomBarBorder'

/**
 * Begin geolocation ASAP
 */
void Geo.resolve()
void prefetchAgeAssuranceConfig()
void prefetchLiveEvents()
void prefetchAppConfig()

function InnerApp() {
  const [isReady, setIsReady] = useState(false)
  const {currentAccount} = useSession()
  const {login, resumeSession} = useSessionApi()
  const theme = useColorModeTheme()
  const {t: l} = useLingui()
  const hasCheckedLanding = useLandingEntry()

  // init
  useEffect(() => {
    async function establishOauthAppSession(
      account?: SessionAccount,
    ): Promise<boolean> {
      const oauthResult = await initOAuthClient()
      if (
        shouldEstablishAppSessionFromOauthInit(oauthResult, Boolean(account))
      ) {
        oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.loginStarting)
        logger.warn(OAUTH_BREADCRUMB.loginStarting)
        try {
          await login(
            {
              service: '',
              identifier: '',
              password: '',
              oauthSession: oauthResult.session,
            },
            'LoginForm',
          )
        } catch (e) {
          oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.loginFailed)
          reportOauthFailureDiagnosis(e)
          throw e
        }
        const afterLogin = decideOauthLoginEstablishedAfterPeek(
          peekLeftoverOauthGrantKeys(),
        )
        if (afterLogin.emitLeftoverGrant) {
          reportOauthFailureDiagnosis(peekLastOauthInitError())
          return true
        }
        if (afterLogin.clearCallbackUrl) {
          clearOauthCallbackUrl()
        }
        return true
      }
      if (hasPendingOauthCallback()) {
        logger.warn(`oauth: login() skipped on callback load`, {
          ...describeOauthInitResult(oauthResult),
        })
      }
      return false
    }

    async function onLaunch(account?: SessionAccount) {
      let established = false
      let retriesExhausted = false
      try {
        established = await establishOauthAppSession(account)
        if (!established && account) {
          await resumeSession(account)
        } else if (!established) {
          await features.init
        }
      } catch (e) {
        logger.warn('session: launch failed', {message: e})
        if (hasPendingOauthCallback()) {
          try {
            logger.warn(`oauth: retrying callback session establishment`)
            established = await establishOauthAppSession(account)
          } catch (retryErr) {
            logger.error(`oauth: callback session retry failed`, {
              message: retryErr,
            })
            reportOauthFailureDiagnosis(retryErr)
            retriesExhausted = true
          }
        }
      }
      if (
        shouldPaintAppAfterOauthLaunch({
          establishedAppSession: established,
          hasCallbackParams: hasPendingOauthCallback(),
          retriesExhausted,
        })
      ) {
        if (
          hasPendingOauthCallback() ||
          hasLeftoverOauthGrantInUrl() ||
          shouldReportSilentAnonymousPaint()
        ) {
          reportOauthFailureDiagnosis(peekLastOauthInitError())
        }
        setIsReady(true)
      }
    }
    const account = readLastActiveAccount()
    void onLaunch(account)
  }, [login, resumeSession])

  useEffect(() => {
    if (!isReady) {
      return
    }
    const leftover = peekLeftoverOauthGrantKeys()
    if (leftoverGrantBlocksSoftGatePass(leftover)) {
      reportOauthFailureDiagnosis(peekLastOauthInitError())
      return
    }
    void (async () => {
      const oauthSessionAlive = currentAccount
        ? await peekOauthSessionAlive(currentAccount.did)
        : false
      if (
        shouldEmitOauthLoginEstablishedBreadcrumb({
          hasCurrentAccount: Boolean(currentAccount),
          leftoverGrantInUrl: leftover.length > 0,
          oauthSessionAlive,
        })
      ) {
        oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.loginEstablished)
        logger.warn(OAUTH_BREADCRUMB.loginEstablished)
      } else if (
        hasPendingOauthCallback() ||
        shouldReportSilentAnonymousPaint()
      ) {
        reportOauthFailureDiagnosis(peekLastOauthInitError())
      }
    })()
  }, [isReady, currentAccount])

  useEffect(() => {
    return listenSessionDropped(() => {
      Toast.show(l`Sorry! Your session expired. Please sign in again.`, {
        type: 'info',
      })
    })
  }, [l])

  return (
    <Alf theme={theme}>
      <ThemeProvider theme={theme}>
        <ContextMenuProvider>
          <Splash isReady={isReady && hasCheckedLanding}>
            <VideoVolumeProvider>
              <ActiveVideoProvider>
                <Fragment
                  // Resets the entire tree below when it changes:
                  key={currentAccount?.did}>
                  <AnalyticsFeaturesContext>
                    <QueryProvider currentDid={currentAccount?.did}>
                      <BetaUserStorageSync />
                      <PolicyUpdateOverlayProvider>
                        <LiveEventsProvider>
                          <AgeAssuranceV2Provider>
                            <ComposerProvider>
                              <MessagesProvider>
                                {/* LabelDefsProvider MUST come before ModerationOptsProvider */}
                                <LabelDefsProvider>
                                  <ModerationOptsProvider>
                                    <LoggedOutViewProvider>
                                      <SelectedFeedProvider>
                                        <HiddenRepliesProvider>
                                          <HomeBadgeProvider>
                                            <UnreadNotifsProvider>
                                              <BackgroundNotificationPreferencesProvider>
                                                <MutedThreadsProvider>
                                                  <SafeAreaProvider>
                                                    <ProgressGuideProvider>
                                                      <ServiceConfigProvider>
                                                        <EmailVerificationProvider>
                                                          <HideBottomBarBorderProvider>
                                                            <IntentDialogProvider>
                                                              <TranslateOnDeviceProvider>
                                                                <HotkeysProvider>
                                                                  <Shell />
                                                                  <ToastOutlet />
                                                                </HotkeysProvider>
                                                              </TranslateOnDeviceProvider>
                                                            </IntentDialogProvider>
                                                          </HideBottomBarBorderProvider>
                                                        </EmailVerificationProvider>
                                                      </ServiceConfigProvider>
                                                    </ProgressGuideProvider>
                                                  </SafeAreaProvider>
                                                </MutedThreadsProvider>
                                              </BackgroundNotificationPreferencesProvider>
                                            </UnreadNotifsProvider>
                                          </HomeBadgeProvider>
                                        </HiddenRepliesProvider>
                                      </SelectedFeedProvider>
                                    </LoggedOutViewProvider>
                                  </ModerationOptsProvider>
                                </LabelDefsProvider>
                              </MessagesProvider>
                            </ComposerProvider>
                          </AgeAssuranceV2Provider>
                        </LiveEventsProvider>
                      </PolicyUpdateOverlayProvider>
                    </QueryProvider>
                  </AnalyticsFeaturesContext>
                </Fragment>
              </ActiveVideoProvider>
            </VideoVolumeProvider>
          </Splash>
        </ContextMenuProvider>
      </ThemeProvider>
    </Alf>
  )
}

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const oauthBoot = wrapBootstrapOauthInit(
      initOAuthClient(),
      hasPendingOauthCallback(),
      error => {
        logger.error(`oauth: bootstrap init failed`, {message: error})
      },
    )
    void Promise.all([
      initPersistedState(),
      Geo.resolve(),
      setupDeviceId,
      oauthBoot,
    ])
      .then(() => setIsReady(true))
      .catch(error => {
        logger.error(`oauth: bootstrap failed with callback params`, {
          message: error,
        })
        reportOauthFailureDiagnosis(error)
        setIsReady(true)
      })
  }, [])

  if (!isReady) {
    return null
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <Geo.Provider>
      <AppConfigProvider>
        <A11yProvider>
          <KeyboardControllerProvider>
            <OnboardingProvider>
              <AnalyticsContext>
                <SessionProvider>
                  <PrefsStateProvider>
                    <I18nProvider>
                      <ShellStateProvider>
                        <DialogStateProvider>
                          <LightboxStateProvider>
                            <PortalProvider>
                              <LandingProvider>
                                <InnerApp />
                              </LandingProvider>
                            </PortalProvider>
                          </LightboxStateProvider>
                        </DialogStateProvider>
                      </ShellStateProvider>
                    </I18nProvider>
                  </PrefsStateProvider>
                </SessionProvider>
              </AnalyticsContext>
            </OnboardingProvider>
          </KeyboardControllerProvider>
        </A11yProvider>
      </AppConfigProvider>
    </Geo.Provider>
  )
}

export default Sentry.wrap(App)
