import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { CompanionCard, CARD_WIDTH } from '../buddy/CompanionCard.js'
import { useCompanionAnimation } from '../buddy/CompanionSprite.js'
import { HatchAnimation, getHatchTotalFrames } from '../buddy/HatchAnimation.js'
import { getActiveCompanion, getCompanion } from '../buddy/companion.js'
import { AppStateProvider, useSetAppState } from './AppState.js'
import {
  MAX_BUDDIES,
  createCompanion,
  doHatch,
  doPet,
  doRelease,
  doRename,
  doStats,
} from './commands.js'
import type { Config } from './config.js'
import { saveGlobalConfig } from './config.js'
import { useStdoutDimensions } from './useStdoutDimensions.js'

const MAX_MESSAGES = 50
const MIN_COLS_FOR_SIDE_CARD = 80
const HATCH_TICK_MS = 400

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

function VerticalMenu({
  items,
  selectedIndex,
}: {
  items: readonly string[]
  selectedIndex: number
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={item} bold={i === selectedIndex}>
          {i === selectedIndex ? `▸ ${item}` : `  ${item}`}
        </Text>
      ))}
    </Box>
  )
}

function MessageList({
  messages,
  maxLines,
}: {
  messages: string[]
  maxLines: number
}): React.ReactNode {
  const visible = messages.slice(Math.max(0, messages.length - maxLines))
  return (
    <Box flexDirection="column" flexGrow={1}>
      {visible.map((msg, i) => (
        <Text key={i} dimColor>
          {msg}
        </Text>
      ))}
    </Box>
  )
}

function getMenuItems(
  hasCompanions: boolean,
  atCap: boolean,
): readonly string[] {
  if (!hasCompanions) return ['Hatch']
  if (atCap) return ['Pet', 'Rename', 'Release', 'Stats']
  return ['Pet', 'Hatch', 'Rename', 'Release', 'Stats']
}

function BuddyShell({
  config,
  setConfig,
}: {
  config: Config
  setConfig: React.Dispatch<React.SetStateAction<Config>>
}): React.ReactNode {
  const [messages, setMessages] = useState<string[]>([
    'Welcome! Select "Hatch" to get your first buddy.',
  ])
  const [menuIndex, setMenuIndex] = useState(0)
  const [renameMode, setRenameMode] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [releaseConfirm, setReleaseConfirm] = useState(false)
  const [releaseIndex, setReleaseIndex] = useState(0)
  const [hatchAnim, setHatchAnim] = useState<{
    tick: number
    companionId: string
  } | null>(null)
  const { exit } = useApp()
  const setAppState = useSetAppState()
  const [columns, rows] = useStdoutDimensions()

  const hasCompanions = config.companions.length > 0
  const atCap = config.companions.length >= MAX_BUDDIES
  const menuItems = getMenuItems(hasCompanions, atCap)
  const clampedIndex = Math.min(menuIndex, menuItems.length - 1)

  const activeIdx = config.companions.findIndex(
    c => c.id === config.activeCompanionId,
  )
  const currentBuddyIndex = activeIdx >= 0 ? activeIdx : 0

  const companion = getActiveCompanion()
  const showSideCard =
    hasCompanions && companion && columns >= MIN_COLS_FOR_SIDE_CARD

  const animation = useCompanionAnimation(companion)
  const menuHeight = menuItems.length + (renameMode ? 1 : 0)
  const maxLines = Math.max(3, rows - menuHeight - 2)

  // Hatch animation timer
  useEffect(() => {
    if (!hatchAnim) return
    if (hatchAnim.tick >= getHatchTotalFrames()) return
    const timer = setInterval(
      () =>
        setHatchAnim(prev =>
          prev ? { ...prev, tick: prev.tick + 1 } : null,
        ),
      HATCH_TICK_MS,
    )
    return () => clearInterval(timer)
  }, [hatchAnim])

  const appendMessages = useCallback((msgs: string[]) => {
    setMessages(prev => {
      const next = [...prev, ...msgs]
      return next.slice(Math.max(0, next.length - MAX_MESSAGES))
    })
  }, [])

  const switchBuddy = useCallback(
    async (delta: number) => {
      const len = config.companions.length
      if (len <= 1) return
      const nextIndex = (currentBuddyIndex + delta + len) % len
      const nextId = config.companions[nextIndex]!.id
      const next = { ...config, activeCompanionId: nextId }
      await saveGlobalConfig(next)
      setConfig(next)
      setAppState(prev => ({
        ...prev,
        companionReaction: undefined,
        companionPetAt: undefined,
      }))
    },
    [config, currentBuddyIndex, setConfig, setAppState],
  )

  const startHatch = useCallback(async () => {
    if (config.companions.length >= MAX_BUDDIES) {
      appendMessages([`You already have ${MAX_BUDDIES} buddies! Release one first.`])
      return
    }
    // Create companion and start animation
    const soul = createCompanion()
    const companions = [...config.companions, soul]
    const next = { ...config, companions, activeCompanionId: soul.id }
    await saveGlobalConfig(next)
    setConfig(next)
    setHatchAnim({ tick: 0, companionId: soul.id })
  }, [config, setConfig, appendMessages])

  const executeMenu = useCallback(
    async (index: number) => {
      const item = menuItems[index]
      if (!item) return

      if (item === 'Pet') {
        const msgs = doPet(setAppState)
        appendMessages(msgs)
      } else if (item === 'Hatch') {
        await startHatch()
      } else if (item === 'Rename') {
        setRenameMode(true)
        setRenameInput('')
      } else if (item === 'Release') {
        setReleaseConfirm(true)
        setReleaseIndex(0)
      } else if (item === 'Stats') {
        const msgs = doStats()
        appendMessages(msgs)
      }
    },
    [menuItems, setAppState, startHatch, appendMessages],
  )

  const confirmRename = useCallback(async () => {
    const name = renameInput.trim()
    if (!name) {
      setRenameMode(false)
      return
    }
    const msgs = await doRename(name, config, setConfig)
    appendMessages(msgs)
    setRenameMode(false)
    setRenameInput('')
  }, [renameInput, config, setConfig, appendMessages])

  useInput((value, key) => {
    if (key.ctrl && (value === 'c' || value === 'd')) {
      exit()
      return
    }

    // Hatch animation: any key dismisses after complete
    if (hatchAnim) {
      if (hatchAnim.tick >= getHatchTotalFrames()) {
        const hatchedCompanion = getCompanion(hatchAnim.companionId)
        if (hatchedCompanion) {
          appendMessages([
            `${hatchedCompanion.name} the ${hatchedCompanion.species} is here!`,
          ])
        }
        setHatchAnim(null)
      }
      return
    }

    // Release confirmation mode
    if (releaseConfirm) {
      if (key.escape) {
        setReleaseConfirm(false)
        return
      }
      if (key.upArrow || key.downArrow) {
        setReleaseIndex(prev => (prev === 0 ? 1 : 0))
        return
      }
      if (key.return) {
        if (releaseIndex === 0) {
          // "Don't go"
          setReleaseConfirm(false)
        } else {
          // "See ya"
          void doRelease(config, setConfig).then(msgs => {
            appendMessages(msgs)
            setReleaseConfirm(false)
          })
        }
        return
      }
      return
    }

    // Rename mode
    if (renameMode) {
      if (key.escape) {
        setRenameMode(false)
        setRenameInput('')
        return
      }
      if (key.return) {
        void confirmRename()
        return
      }
      if (key.backspace || key.delete) {
        setRenameInput(prev => prev.slice(0, -1))
        return
      }
      if (key.ctrl || key.meta) return
      if (value) {
        setRenameInput(prev => prev + value)
      }
      return
    }

    // Normal mode
    if (key.upArrow) {
      setMenuIndex(prev => (prev - 1 + menuItems.length) % menuItems.length)
      return
    }
    if (key.downArrow) {
      setMenuIndex(prev => (prev + 1) % menuItems.length)
      return
    }
    if (key.leftArrow) {
      void switchBuddy(-1)
      return
    }
    if (key.rightArrow) {
      void switchBuddy(1)
      return
    }
    if (key.return) {
      void executeMenu(clampedIndex)
      return
    }
  })

  // Hatch animation fullscreen
  if (hatchAnim) {
    const hatchedCompanion = getCompanion(hatchAnim.companionId)
    if (hatchedCompanion) {
      return (
        <Box
          flexDirection="column"
          width={columns}
          alignItems="center"
          justifyContent="center"
        >
          <HatchAnimation companion={hatchedCompanion} tick={hatchAnim.tick} />
        </Box>
      )
    }
  }

  // Release confirmation UI
  const rightBottomContent = releaseConfirm ? (
    <Box flexDirection="column">
      <Text color="yellow">
        Release {companion?.name ?? 'buddy'}?
      </Text>
      <Text bold={releaseIndex === 0}>
        {releaseIndex === 0 ? '▸ ' : '  '}Don't go
      </Text>
      <Text bold={releaseIndex === 1}>
        {releaseIndex === 1 ? '▸ ' : '  '}See ya
      </Text>
    </Box>
  ) : renameMode ? (
    <Box>
      <Text color="cyan">New name: </Text>
      <Text>{renameInput}</Text>
      <Text dimColor>█</Text>
    </Box>
  ) : (
    <VerticalMenu items={menuItems} selectedIndex={clampedIndex} />
  )

  return (
    <Box flexDirection="row" width={columns}>
      {/* Left column: page dots + card */}
      {showSideCard && companion && (
        <Box flexDirection="column" width={CARD_WIDTH} flexShrink={0}>
          {config.companions.length > 1 && (
            <PageIndicator
              total={config.companions.length}
              active={currentBuddyIndex}
            />
          )}
          <CompanionCard
            companion={companion}
            spriteLines={animation.spriteLines}
            reaction={animation.reaction}
            fading={animation.fading}
            tick={animation.tick}
          />
        </Box>
      )}

      {/* Right column: log + menu/confirm/rename */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingLeft={showSideCard ? 1 : 0}
      >
        <MessageList messages={messages} maxLines={maxLines} />
        {rightBottomContent}
      </Box>
    </Box>
  )
}

export function App({
  initialConfig,
}: {
  initialConfig: Config
}): React.ReactNode {
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
