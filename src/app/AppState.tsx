import React, { createContext, useContext, useMemo, useState } from 'react'

export type AppState = {
  companionReaction?: string
  companionPetAt?: number
}

type AppStateContextValue = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({
  initialState,
  children,
}: {
  initialState: AppState
  children: React.ReactNode
}): React.ReactNode {
  const [state, setState] = useState<AppState>(initialState)
  const value = useMemo(() => ({ state, setState }), [state])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState<T>(selector: (state: AppState) => T): T {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('AppStateProvider is missing')
  }
  return selector(ctx.state)
}

export function useSetAppState(): React.Dispatch<React.SetStateAction<AppState>> {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('AppStateProvider is missing')
  }
  return ctx.setState
}
