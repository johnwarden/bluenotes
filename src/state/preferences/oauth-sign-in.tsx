import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {isOauthEnvForced, isOauthSignInAvailable} from '#/lib/oauth/config'
import * as persisted from '#/state/persisted'

type StateContext = boolean
type SetContext = (v: boolean) => void

const defaultEnabled = isOauthSignInAvailable()

const stateContext = createContext<StateContext>(defaultEnabled)
stateContext.displayName = 'OauthSignInStateContext'
const setContext = createContext<SetContext>((_: boolean) => {})
setContext.displayName = 'OauthSignInSetContext'

export function Provider({children}: {children: ReactNode}) {
  const [state, setState] = useState<boolean>(() => {
    if (!isOauthSignInAvailable()) {
      return false
    }
    if (isOauthEnvForced()) {
      return true
    }
    const stored = persisted.get('oauthSignInEnabled')
    return stored ?? defaultEnabled
  })

  const setStateWrapped = useCallback((oauthSignInEnabled: boolean) => {
    setState(oauthSignInEnabled)
    void persisted.write('oauthSignInEnabled', oauthSignInEnabled)
  }, [])

  useEffect(() => {
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

export const useOauthSignInEnabled = () => useContext(stateContext)
export const useSetOauthSignInEnabled = () => useContext(setContext)

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
