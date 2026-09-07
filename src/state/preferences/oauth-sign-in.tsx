import React from 'react'

import {isOauthEnvForced, isOauthSignInAvailable} from '#/lib/oauth/config'
import * as persisted from '#/state/persisted'

type StateContext = boolean
type SetContext = (v: boolean) => void

const defaultEnabled = isOauthSignInAvailable()

const stateContext = React.createContext<StateContext>(defaultEnabled)
stateContext.displayName = 'OauthSignInStateContext'
const setContext = React.createContext<SetContext>((_: boolean) => {})
setContext.displayName = 'OauthSignInSetContext'

export function Provider({children}: {children: React.ReactNode}) {
  const [state, setState] = React.useState<boolean>(() => {
    if (!isOauthSignInAvailable()) {
      return false
    }
    if (isOauthEnvForced()) {
      return true
    }
    const stored = persisted.get('oauthSignInEnabled')
    return stored ?? defaultEnabled
  })

  const setStateWrapped = React.useCallback((oauthSignInEnabled: boolean) => {
    setState(oauthSignInEnabled)
    persisted.write('oauthSignInEnabled', oauthSignInEnabled)
  }, [])

  React.useEffect(() => {
    return persisted.onUpdate('oauthSignInEnabled', next => {
      if (!isOauthSignInAvailable()) {
        setState(false)
        return
      }
      if (isOauthEnvForced()) {
        setState(true)
        return
      }
      setState(next ?? defaultEnabled)
    })
  }, [])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export const useOauthSignInEnabled = () => React.useContext(stateContext)
export const useSetOauthSignInEnabled = () => React.useContext(setContext)

export function useOauthSignIn(): boolean {
  const preferenceEnabled = useOauthSignInEnabled()
  if (!isOauthSignInAvailable()) {
    return false
  }
  if (isOauthEnvForced()) {
    return true
  }
  return preferenceEnabled
}
