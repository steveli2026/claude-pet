import React, { useCallback, useMemo, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { CompanionCard, CARD_WIDTH } from '../buddy/CompanionCard.js'
import { useCompanionAnimation } from '../buddy/CompanionSprite.js'
import { getActiveCompanion } from '../buddy/companion.js'
import { AppStateProvider, useAppState, useSetAppState } from './AppState.js'
import { runBuddyCommand } from './commands.js'
import type { Config } from './config.js'
import { saveGlobalConfig } from './config.js'
import { findNameReaction } from './reactions.js'
import { useStdoutDimensions } from './useStdoutDimensions.js'

type LogEntry = {
  type: 'user' | 'system'
  text: string
}

const MAX_LOGS = 200
const MIN_COLS_FOR_SIDE_CARD = 80

function LogList({ logs, maxLines }: { logs: LogEntry[]; maxLines: number }) {
  const visible = logs.slice(Math.max(0, logs.length - maxLines))
  return (
    <Box flexDirection="column" flexGrow={1}>
      {visible.map((entry, idx) => (
        <Text key={`${entry.type}-${idx}`} dimColor={entry.type === 'system'}>
          {entry.type === 'user' ? '> ' : ''}
          {entry.text}
        </Text>
      ))}
    </Box>
  )
}

function PageIndicator({
  total,
  active,
}: {
  total: number
  active: number
}): React.ReactNode {
  if (total <= 1) return null
  const dots = Array.from({ length: total }, (_, i) =>
    i === active ? '●' : '·',
  )
  return (
    <Box justifyContent="center">
      <Text dimColor>{dots.join(' ')}</Text>
    </Box>
  )
}

function BuddyShell({
  config,
  setConfig,
}: {
  config: Config
  setConfig: React.Dispatch<React.SetStateAction<Config>>
}): React.ReactNode {
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'system', text: 'Type /buddy to hatch your companion.' },
  ])
  const { exit } = useApp()
  const setAppState = useSetAppState()
  const [columns, rows] = useStdoutDimensions()

  // Active buddy index
  const activeIndex = config.companions.findIndex(
    c => c.id === config.activeCompanionId,
  )
  const currentIndex = activeIndex >= 0 ? activeIndex : 0

  const companion = getActiveCompanion()
  const hasCompanions = config.companions.length > 0
  const showSideCard = hasCompanions && companion && columns >= MIN_COLS_FOR_SIDE_CARD

  const animation = useCompanionAnimation(companion)

  const maxLines = Math.max(5, rows - 3)

  const appendLogs = useCallback((entries: LogEntry[]) => {
    setLogs(prev => {
      const next = [...prev, ...entries]
      return next.slice(Math.max(0, next.length - MAX_LOGS))
    })
  }, [])

  const handleLine = useCallback(
    async (line: string) => {
      appendLogs([{ type: 'user', text: line }])
      const result = await runBuddyCommand(line, config, setConfig, setAppState)
      if (result) {
        appendLogs(result.map(text => ({ type: 'system', text })))
        return
      }
      const current = getActiveCompanion()
      if (current) {
        const reaction = findNameReaction(line, current.name)
        if (reaction) {
          setAppState(prev => ({ ...prev, companionReaction: reaction }))
        }
      }
    },
    [appendLogs, config, setAppState, setConfig],
  )

  const submit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) {
      setInput('')
      return
    }
    void handleLine(trimmed)
    setInput('')
  }, [handleLine, input])

  const switchBuddy = useCallback(
    async (delta: number) => {
      const len = config.companions.length
      if (len <= 1) return
      const nextIndex = (currentIndex + delta + len) % len
      const nextId = config.companions[nextIndex]!.id
      const next = { ...config, activeCompanionId: nextId }
      await saveGlobalConfig(next)
      setConfig(next)
      // Clear reaction when switching
      setAppState(prev => ({ ...prev, companionReaction: undefined, companionPetAt: undefined }))
    },
    [config, currentIndex, setConfig, setAppState],
  )

  useInput((value, key) => {
    if (key.ctrl && value === 'c') {
      exit()
      return
    }
    if (key.ctrl && value === 'd') {
      exit()
      return
    }
    if (key.leftArrow && config.companions.length > 1) {
      void switchBuddy(-1)
      return
    }
    if (key.rightArrow && config.companions.length > 1) {
      void switchBuddy(1)
      return
    }
    if (key.return) {
      submit()
      return
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1))
      return
    }
    if (key.escape) {
      setInput('')
      return
    }
    if (key.ctrl || key.meta) return
    if (value) {
      setInput(prev => prev + value)
    }
  })

  return (
    <Box flexDirection="column" width={columns}>
      <Box flexDirection="row" width={columns}>
        {/* Left: Card */}
        {showSideCard && companion && (
          <Box flexDirection="column" width={CARD_WIDTH} flexShrink={0}>
            <CompanionCard
              companion={companion}
              spriteLines={animation.spriteLines}
              reaction={animation.reaction}
              fading={animation.fading}
            />
          </Box>
        )}
        {/* Right: Logs + input */}
        <Box flexDirection="column" flexGrow={1}>
          <LogList logs={logs} maxLines={maxLines} />
          <Text>
            <Text color="cyan">› </Text>
            {input || ''}
          </Text>
        </Box>
      </Box>
      {/* Page indicator */}
      {config.companions.length > 1 && (
        <PageIndicator total={config.companions.length} active={currentIndex} />
      )}
    </Box>
  )
}

export function App({ initialConfig }: { initialConfig: Config }): React.ReactNode {
  const [config, setConfig] = useState<Config>(initialConfig)
  const initialState = useMemo(
    () => ({ companionReaction: undefined, companionPetAt: undefined }),
    [],
  )
  return (
    <AppStateProvider initialState={initialState}>
      <BuddyShell config={config} setConfig={setConfig} />
    </AppStateProvider>
  )
}
