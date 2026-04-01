import figures from 'figures'
import React, { useEffect, useRef, useState } from 'react'
import { useAppState, useSetAppState } from '../app/AppState.js'
import { pickIdleChatter } from '../app/reactions.js'
import type { Companion } from './types.js'
import { renderSprite, spriteFrameCount } from './sprites.js'

const TICK_MS = 500
const BUBBLE_SHOW = 20
const FADE_WINDOW = 6
const PET_BURST_MS = 2500

const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0]

const H = figures.heart
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  ',
]

export function useCompanionAnimation(companion: Companion | undefined): {
  spriteLines: string[]
  heartFrame: string | null
  reaction: string | undefined
  fading: boolean
  tick: number
} {
  const reaction = useAppState(s => s.companionReaction)
  const petAt = useAppState(s => s.companionPetAt)
  const setAppState = useSetAppState()
  const [tick, setTick] = useState(0)
  const lastSpokeTick = useRef(0)
  const prevStep = useRef(0)
  const [{ petStartTick, forPetAt }, setPetStart] = useState({
    petStartTick: 0,
    forPetAt: petAt,
  })

  if (petAt !== forPetAt) {
    setPetStart({ petStartTick: tick, forPetAt: petAt })
  }

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!reaction) return
    lastSpokeTick.current = tick
    const timer = setTimeout(
      () =>
        setAppState(prev =>
          prev.companionReaction === undefined
            ? prev
            : { ...prev, companionReaction: undefined },
        ),
      BUBBLE_SHOW * TICK_MS,
    )
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick intentionally captured at reaction-change, not tracked
  }, [reaction, setAppState])

  if (!companion) {
    return { spriteLines: [], heartFrame: null, reaction: undefined, fading: false, tick }
  }

  const bubbleAge = reaction ? tick - lastSpokeTick.current : 0
  const fading = reaction !== undefined && bubbleAge >= BUBBLE_SHOW - FADE_WINDOW
  const petAge = petAt ? tick - petStartTick : Infinity
  const petting = petAge * TICK_MS < PET_BURST_MS

  const frameCount = spriteFrameCount(companion.species)
  let spriteFrame: number
  let blink = false
  if (reaction || petting) {
    spriteFrame = tick % frameCount
  } else {
    const step = IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!
    if (step === -1) {
      spriteFrame = 0
      blink = true
    } else {
      spriteFrame = step % frameCount
    }
  }

  // Idle chatter — must be in useEffect, not during render
  useEffect(() => {
    if (!companion || reaction || petting) return
    const step = IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!
    if (step > 0 && prevStep.current === 0 && Math.random() < 0.3) {
      setAppState(prev =>
        prev.companionReaction ? prev : { ...prev, companionReaction: pickIdleChatter() },
      )
    }
    prevStep.current = step
  }, [tick, companion, reaction, petting, setAppState])

  const body = renderSprite(companion, spriteFrame).map(line =>
    blink ? line.replaceAll(companion.eye, '-') : line,
  )

  const heartFrame = petting ? (PET_HEARTS[petAge % PET_HEARTS.length] ?? null) : null
  const spriteLines = heartFrame ? [heartFrame, ...body] : body

  return { spriteLines, heartFrame, reaction, fading, tick }
}
