import React from 'react'
import { Box, Text } from 'ink'
import type { Companion } from './types.js'
import { RARITY_STARS, STAT_NAMES } from './types.js'
import { renderSprite } from './sprites.js'

const CARD_INNER_WIDTH = 36
const BAR_WIDTH = 10

const BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

const RAINBOW = ['red', 'redBright', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const

function getRainbowColor(charIndex: number, tick: number): string {
  return RAINBOW[(charIndex + tick) % RAINBOW.length]!
}

function RainbowText({
  text,
  tick,
  bold,
}: {
  text: string
  tick: number
  bold?: boolean
}): React.ReactNode {
  return (
    <>
      {[...text].map((ch, i) => (
        <Text key={i} color={getRainbowColor(i, tick)} bold={bold}>
          {ch}
        </Text>
      ))}
    </>
  )
}

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
  tick = 0,
}: {
  companion: Companion
  spriteLines?: string[]
  reaction?: string
  fading?: boolean
  tick?: number
}): React.ReactNode {
  const color = companion.color
  const isShiny = companion.shiny
  const stars = RARITY_STARS[companion.rarity]
  const sprite = spriteLines ?? renderSprite(companion, 0)
  const speciesLabel = companion.species.toUpperCase()

  // Build header text — truncate if needed to fit within card
  const rarityText = `${stars} ${companion.rarity.toUpperCase()}`
  const speciesText = speciesLabel + (isShiny ? ' ✨' : '')

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isShiny ? getRainbowColor(0, tick) : color}
      paddingX={1}
      width={CARD_WIDTH}
    >
      {/* Header: rarity + species */}
      <Box width={CARD_INNER_WIDTH}>
        <Box flexGrow={1}>
          {isShiny ? (
            <RainbowText text={rarityText} tick={tick} bold />
          ) : (
            <Text color={color} bold>{rarityText}</Text>
          )}
        </Box>
        <Box>
          {isShiny ? (
            <RainbowText text={speciesText} tick={tick} bold />
          ) : (
            <Text color={color} bold>{speciesText}</Text>
          )}
        </Box>
      </Box>

      <Text> </Text>

      {/* Sprite */}
      <Box flexDirection="column" alignItems="center" width={CARD_INNER_WIDTH}>
        {sprite.map((line, i) =>
          isShiny ? (
            <Box key={i}>
              <RainbowText text={line} tick={tick} />
            </Box>
          ) : (
            <Text key={i} color={color}>
              {line}
            </Text>
          ),
        )}
      </Box>

      <Text> </Text>

      {/* Name */}
      {isShiny ? (
        <Box>
          <RainbowText text={companion.name} tick={tick} bold />
        </Box>
      ) : (
        <Text bold>{companion.name}</Text>
      )}

      <Text> </Text>

      {/* Speech bubble / personality */}
      {reaction ? (
        <>
          {wrapText(`"${reaction}"`, CARD_INNER_WIDTH).map((line, i) => (
            <Text
              key={i}
              italic
              color={fading ? 'gray' : undefined}
              dimColor={!fading}
            >
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
            <Text dimColor>{padded} </Text>
            <StatBar
              value={value}
              width={BAR_WIDTH}
              color={isShiny ? getRainbowColor(STAT_NAMES.indexOf(name), tick) : color}
            />
            <Text dimColor> {numStr}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
