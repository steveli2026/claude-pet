import React from 'react'
import { Box, Text } from 'ink'
import type { Companion } from './types.js'
import { renderSprite } from './sprites.js'

const RAINBOW = ['red', 'redBright', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const

function rc(i: number, tick: number): string {
  return RAINBOW[(i + tick) % RAINBOW.length]!
}

// Egg frames — progressive crack sequence
const EGG_FRAMES: string[][] = [
  // Frame 0: pristine egg
  [
    '            ',
    '    .---.   ',
    '   /     \\  ',
    '  |       | ',
    '   \\     /  ',
    '    \'---\'   ',
  ],
  // Frame 1: small crack
  [
    '     ✦      ',
    '    .---.   ',
    '   /  .  \\  ',
    '  |   ·   | ',
    '   \\  .  /  ',
    '    \'---\'   ',
  ],
  // Frame 2: bigger cracks
  [
    '    ✦  ✦    ',
    '    .-·-.   ',
    '   / · · \\  ',
    '  | ·   · | ',
    '   \\ · · /  ',
    '    \'-·-\'   ',
  ],
  // Frame 3: cracking open
  [
    '   ✨ ✦ ✨   ',
    '    /\\ /\\   ',
    '   / ·✦· \\  ',
    '  | ✦   ✦ | ',
    '   \\·   ·/  ',
    '    \'-v-\'   ',
  ],
  // Frame 4: splitting
  [
    '  ✨  ✦  ✨  ',
    '   .\\   /.  ',
    '  / ✦ ✦ ✦ \\ ',
    '  | ✨ · ✨ | ',
    '   \\_   _/  ',
    '    \\   /   ',
  ],
  // Frame 5: burst open
  [
    ' ✨ ✨ ✦ ✨ ✨ ',
    '  ✦       ✦ ',
    ' ✨  .---.  ✨',
    ' ✦  |   |  ✦',
    '  ✨ \'---\' ✨ ',
    ' ✦  ✦ ✨ ✦  ✦',
  ],
]

const TOTAL_FRAMES = EGG_FRAMES.length + 4 // 6 egg + 4 reveal frames

export function getHatchTotalFrames(): number {
  return TOTAL_FRAMES
}

export function HatchAnimation({
  companion,
  tick,
}: {
  companion: Companion
  tick: number
}): React.ReactNode {
  const frame = Math.min(tick, TOTAL_FRAMES - 1)

  // Egg phase (frames 0-5)
  if (frame < EGG_FRAMES.length) {
    const eggLines = EGG_FRAMES[frame]!
    const sparkleIntensity = frame
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        {/* Top sparkles */}
        {frame >= 3 && (
          <Box>
            {Array.from({ length: 5 }, (_, i) => (
              <Text key={i} color={rc(i, tick)}>
                {Math.random() > 0.4 ? ' ✦' : ' ·'}
              </Text>
            ))}
          </Box>
        )}

        {/* Egg */}
        {eggLines.map((line, i) => (
          <Text key={i} color={rc(i + sparkleIntensity, tick)} bold={frame >= 3}>
            {line}
          </Text>
        ))}

        {/* Bottom sparkles */}
        {frame >= 2 && (
          <Box>
            {Array.from({ length: 5 }, (_, i) => (
              <Text key={i} color={rc(i + 3, tick)}>
                {Math.random() > 0.5 ? ' ✨' : ' ·'}
              </Text>
            ))}
          </Box>
        )}

        <Text> </Text>
        <Text dimColor italic>something is hatching...</Text>
      </Box>
    )
  }

  // Reveal phase (frames 6-9): companion sprite with sparkle border
  const sprite = renderSprite(companion, (tick) % 3)
  const revealTick = frame - EGG_FRAMES.length
  const showName = revealTick >= 1
  const showPersonality = revealTick >= 2
  const showStats = revealTick >= 3

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Sparkle burst above */}
      <Box>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} color={rc(i, tick)}>
            {i % 2 === 0 ? '✨' : ' '}
          </Text>
        ))}
      </Box>

      {/* Sprite */}
      {sprite.map((line, i) => (
        <Text key={i} color={rc(i, tick)} bold>
          {line}
        </Text>
      ))}

      {/* Name reveal */}
      {showName && (
        <>
          <Text> </Text>
          <Box>
            {[...companion.name].map((ch, i) => (
              <Text key={i} color={rc(i, tick)} bold>
                {ch}
              </Text>
            ))}
          </Box>
        </>
      )}

      {/* Personality reveal */}
      {showPersonality && (
        <Text italic dimColor>
          "{companion.personality}"
        </Text>
      )}

      {/* Final: species + rarity */}
      {showStats && (
        <Text dimColor>
          {companion.species} · {companion.rarity}
          {companion.shiny ? ' ✨' : ''}
        </Text>
      )}

      {/* Sparkle burst below */}
      <Box>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} color={rc(i + 4, tick)}>
            {i % 2 === 0 ? '✦' : ' '}
          </Text>
        ))}
      </Box>

      {showStats && (
        <>
          <Text> </Text>
          <Text dimColor>press any key</Text>
        </>
      )}
    </Box>
  )
}
