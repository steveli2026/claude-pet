import React from 'react'
import { Box, Text } from 'ink'
import type { Companion } from './types.js'
import { RARITY_STARS, STAT_NAMES } from './types.js'
import { renderSprite } from './sprites.js'

const CARD_INNER_WIDTH = 36
const BAR_WIDTH = 10

const BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

function StatBar({
  value,
  width,
  color,
}: {
  value: number
  width: number
  color: string
}): React.ReactNode {
  const ratio = Math.min(1, Math.max(0, value / 100))
  const whole = Math.floor(ratio * width)
  const segments = [BLOCKS[BLOCKS.length - 1]!.repeat(whole)]
  if (whole < width) {
    const remainder = ratio * width - whole
    const middle = Math.floor(remainder * BLOCKS.length)
    segments.push(BLOCKS[middle]!)
    const empty = width - whole - 1
    if (empty > 0) {
      segments.push(BLOCKS[0]!.repeat(empty))
    }
  }
  return <Text color={color}>{segments.join('')}</Text>
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur.length + w.length + 1 > width && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? `${cur} ${w}` : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

export const CARD_WIDTH = CARD_INNER_WIDTH + 4 // border + padding

export function CompanionCard({
  companion,
  spriteLines,
  reaction,
  fading,
}: {
  companion: Companion
  spriteLines?: string[]
  reaction?: string
  fading?: boolean
}): React.ReactNode {
  const color = companion.color
  const stars = RARITY_STARS[companion.rarity]
  const sprite = spriteLines ?? renderSprite(companion, 0)
  const speciesLabel = companion.species.toUpperCase()
  const shinyLabel = companion.shiny ? ' ✨' : ''

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      width={CARD_WIDTH}
    >
      {/* Header: rarity + species */}
      <Box justifyContent="space-between" width={CARD_INNER_WIDTH}>
        <Text color={color} bold>
          {stars} {companion.rarity.toUpperCase()}
        </Text>
        <Text color={color} bold>
          {speciesLabel}{shinyLabel}
        </Text>
      </Box>

      <Text> </Text>

      {/* Sprite */}
      <Box flexDirection="column" alignItems="center" width={CARD_INNER_WIDTH}>
        {sprite.map((line, i) => (
          <Text key={i} color={color}>
            {line}
          </Text>
        ))}
      </Box>

      <Text> </Text>

      {/* Name */}
      <Text bold>{companion.name}</Text>

      <Text> </Text>

      {/* Speech bubble / personality */}
      {reaction ? (
        <>
          {wrapText(`"${reaction}"`, CARD_INNER_WIDTH).map((line, i) => (
            <Text key={i} italic color={fading ? 'gray' : undefined} dimColor={!fading}>
              {line}
            </Text>
          ))}
          <Text> </Text>
        </>
      ) : companion.personality ? (
        <>
          {wrapText(`"${companion.personality}"`, CARD_INNER_WIDTH).map(
            (line, i) => (
              <Text key={i} italic dimColor>
                {line}
              </Text>
            ),
          )}
          <Text> </Text>
        </>
      ) : null}

      {/* Stat bars */}
      {STAT_NAMES.map(name => {
        const value = companion.stats[name]
        const padded = name.padEnd(10)
        const numStr = String(value).padStart(3)
        return (
          <Box key={name}>
            <Text dimColor>
              {padded}{' '}
            </Text>
            <StatBar value={value} width={BAR_WIDTH} color={color} />
            <Text dimColor> {numStr}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
