import React, { useCallback, useMemo, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { CompanionCard, CARD_WIDTH } from '../buddy/CompanionCard.js'
import { useCompanionAnimation } from '../buddy/CompanionSprite.js'
import { getActiveCompanion } from '../buddy/companion.js'
import { AppStateProvider, useSetAppState } from './AppState.js'
import { doHatch, doPet, doRename, doStats } from './commands.js'
import type { Config } from './config.js'
import { saveGlobalConfig } from './config.js'
import { useStdoutDimensions } from './useStdoutDimensions.js'

const MAX_MESSAGES = 50
const MIN_COLS_FOR_SIDE_CARD = 80

const MENU_HAS_BUDDY = ['Pet', 'Hatch', 'Rename', 'Stats'] as const
const MENU_NO_BUDDY = ['Hatch'] as const

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

function MenuBar({
  items,
  selectedIndex,
}: {
  items: readonly string[]
  selectedIndex: number
}): React.ReactNode {
  return (
    <Box>
      {items.map((item, i) => (
        <Text
          key={item}
          bold={i === selectedIndex}
          inverse={i === selectedIndex}
        >
          {i === selectedIndex ? ` ${item} ` : `  ${item}  `}
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
  const { exit } = useApp()
  const setAppState = useSetAppState()
  const [columns, rows] = useStdoutDimensions()

  const hasCompanions = config.companions.length > 0
  const menuItems = hasCompanions ? MENU_HAS_BUDDY : MENU_NO_BUDDY
  const clampedIndex = Math.min(menuIndex, menuItems.length - 1)

  const activeIdx = config.companions.findIndex(
    c => c.id === config.activeCompanionId,
  )
  const currentBuddyIndex = activeIdx >= 0 ? activeIdx : 0

  const companion = getActiveCompanion()
  const showSideCard =
    hasCompanions && companion && columns >= MIN_COLS_FOR_SIDE_CARD

  const animation = useCompanionAnimation(companion)
  const maxLines = Math.max(3, rows - 4)

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

  const executeMenu = useCallback(
    async (index: number) => {
      const item = menuItems[index]
      if (!item) return

      if (item === 'Pet') {
        const msgs = doPet(setAppState)
        appendMessages(msgs)
      } else if (item === 'Hatch') {
        const msgs = await doHatch(config, setConfig)
        appendMessages(msgs)
      } else if (item === 'Rename') {
        setRenameMode(true)
        setRenameInput('')
      } else if (item === 'Stats') {
        const msgs = doStats()
        appendMessages(msgs)
      }
    },
    [menuItems, setAppState, config, setConfig, appendMessages],
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

    // Rename mode: capture text input
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

  return (
    <Box flexDirection="column" width={columns}>
      {/* Page indicator above card */}
      {config.companions.length > 1 && (
        <PageIndicator
          total={config.companions.length}
          active={currentBuddyIndex}
        />
      )}

      {/* Main content row */}
      <Box flexDirection="row" width={columns}>
        {/* Left: Card */}
        {showSideCard && companion && (
          <Box flexDirection="column" width={CARD_WIDTH} flexShrink={0}>
            <CompanionCard
              companion={companion}
              spriteLines={animation.spriteLines}
              reaction={animation.reaction}
              fading={animation.fading}
              tick={animation.tick}
            />
          </Box>
        )}
        {/* Right: Messages */}
        <Box flexDirection="column" flexGrow={1} paddingLeft={showSideCard ? 1 : 0}>
          <MessageList messages={messages} maxLines={maxLines} />
        </Box>
      </Box>

      {/* Bottom: Menu bar or rename input */}
      {renameMode ? (
        <Box>
          <Text color="cyan">New name: </Text>
          <Text>{renameInput}</Text>
          <Text dimColor>█</Text>
        </Box>
      ) : (
        <MenuBar items={menuItems} selectedIndex={clampedIndex} />
      )}
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
