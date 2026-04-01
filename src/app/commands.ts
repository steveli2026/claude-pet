import crypto from 'node:crypto'
import type { Dispatch, SetStateAction } from 'react'
import { getActiveCompanion, getAllCompanions, rollWithSeed, SALT } from '../buddy/companion.js'
import {
  BUDDY_COLORS,
  RARITY_STARS,
  type Companion,
  type StoredCompanion,
} from '../buddy/types.js'
import type { AppState } from './AppState.js'
import type { Config } from './config.js'
import { resolveUserId, saveGlobalConfig } from './config.js'
import { pickPetReaction } from './reactions.js'

const NAMES = [
  'Mochi',
  'Pip',
  'Noodle',
  'Pebble',
  'Sprout',
  'Taro',
  'Biscuit',
  'Orbit',
  'Maple',
  'Ziggy',
]

const PERSONALITY_TEMPLATES: Record<string, string[]> = {
  duck: [
    'Waddles around your code with quiet confidence, occasionally quacking at suspicious indentation.',
    'Rubber-duck debugging taken literally — will stare at your code until the bug confesses.',
  ],
  goose: [
    'Chaotic energy personified. Will honk at your linting errors and steal your semicolons.',
    'Aggressively helpful — charges at bugs with zero hesitation and questionable aim.',
  ],
  blob: [
    'A gentle presence that absorbs your frustrations and occasionally wobbles encouragingly.',
    'Formless but opinionated. Reshapes itself to match whatever energy the codebase needs.',
  ],
  cat: [
    'Catastrophically patient with your bugs but will silently judge every bad variable name, occasionally sighing as if to say "of course you named it that."',
    'Pretends not to care about your code, but you catch it fixing typos when it thinks you\'re not looking.',
  ],
  dragon: [
    'Breathes fire on flaky tests and hoards well-written functions like treasure.',
    'Tiny but fierce. Will incinerate any TODO comment older than a week.',
  ],
  octopus: [
    'Eight arms means eight files open at once. Thrives in chaos, panics in simplicity.',
    'Can refactor eight modules simultaneously while sipping coffee with a spare tentacle.',
  ],
  owl: [
    'Stays up reviewing your PRs at 3am. Knows things. Will not tell you how.',
    'Wise beyond its deploy cycles. Blinks slowly at runtime errors as if they are beneath it.',
  ],
  penguin: [
    'Slides gracefully through your CI pipeline, tuxedo always pristine.',
    'Waddles determinedly toward production, ignoring the ice cracks in your test coverage.',
  ],
  turtle: [
    'Slow and steady. Will get to your PR review eventually. Quality takes time.',
    'Carries the weight of legacy code on its shell without complaint.',
  ],
  snail: [
    'Leaves a trail of well-documented commit messages wherever it goes.',
    'Takes its time but arrives with zero bugs. You could learn something.',
  ],
  ghost: [
    'Haunts your unused imports and dead code paths. Mostly harmless.',
    'Phases through walls of text to find the one line that matters.',
  ],
  axolotl: [
    'Can regenerate entire modules from a single function signature. Smiles through every rebase.',
    'Perpetually smiling, even during merge conflicts. It knows something you don\'t.',
  ],
  capybara: [
    'The chillest code reviewer you\'ll ever meet. Approves vibes, not just logic.',
    'Sits calmly beside your terminal radiating peace while everything is on fire.',
  ],
  cactus: [
    'Prickly about code quality but secretly soft on the inside. Don\'t touch the linting rules.',
    'Survives in any environment with minimal resources. Your perfect production companion.',
  ],
  robot: [
    'Runs your test suite with mechanical precision. Has opinions about whitespace.',
    'Beeps disapprovingly at magic numbers. Boops approvingly at type safety.',
  ],
  rabbit: [
    'Hops between branches at alarming speed. Occasionally digs holes in your abstractions.',
    'Fast but easily startled by unexpected errors. Will freeze, then sprint to a fix.',
  ],
  mushroom: [
    'Grows on you. Thrives in the dark corners of your codebase nobody else dares explore.',
    'Spreads helpful spores of documentation through neglected modules.',
  ],
  chonk: [
    'Absolute unit. Takes up extra terminal space and is not sorry about it.',
    'Big energy, big heart, big opinions about your architecture decisions.',
  ],
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function generatePersonality(species: string, seed: number): string {
  const templates = PERSONALITY_TEMPLATES[species] ?? [
    'A mysterious companion with unknowable depths.',
  ]
  return templates[seed % templates.length]!
}

export const MAX_BUDDIES = 8

export function createCompanion(): StoredCompanion {
  const name = pick(NAMES)
  const id = crypto.randomUUID()
  const seed = `${resolveUserId()}:${SALT}:${Date.now()}`
  const { bones, inspirationSeed } = rollWithSeed(seed)
  const personality = generatePersonality(bones.species, inspirationSeed)
  const color = pick(BUDDY_COLORS)
  return { name, personality, id, seed, color, hatchedAt: Date.now() }
}

export async function doHatch(
  config: Config,
  setConfig: Dispatch<SetStateAction<Config>>,
): Promise<string[]> {
  if (config.companions.length >= MAX_BUDDIES) {
    return [`You already have ${MAX_BUDDIES} buddies! Release one first.`]
  }
  const soul = createCompanion()
  const companions = [...config.companions, soul]
  const next = { ...config, companions, activeCompanionId: soul.id }
  await saveGlobalConfig(next)
  setConfig(next)
  const { bones } = rollWithSeed(soul.seed)
  return [
    `${soul.name} the ${bones.species} hatched! (${bones.rarity} ${RARITY_STARS[bones.rarity]})`,
    companions.length > 1
      ? `You now have ${companions.length} buddies. Use ←/→ to switch.`
      : 'Use ←/→ to switch buddies after hatching more.',
  ]
}

export function doPet(
  name: string,
  setAppState: Dispatch<SetStateAction<AppState>>,
): string[] {
  setAppState(prev => ({
    ...prev,
    companionPetAt: Date.now(),
    companionReaction: pickPetReaction(),
  }))
  return [`${name} seems delighted.`]
}

export async function doRename(
  name: string,
  config: Config,
  setConfig: Dispatch<SetStateAction<Config>>,
): Promise<string[]> {
  const companions = config.companions.map(c =>
    c.id === config.activeCompanionId ? { ...c, name } : c,
  )
  const next = { ...config, companions }
  await saveGlobalConfig(next)
  setConfig(next)
  return [`Renamed to ${name}.`]
}

export function doStats(): string[] {
  const companion = getActiveCompanion()
  if (!companion) return ['No companion.']
  const stars = RARITY_STARS[companion.rarity]
  const stats = Object.entries(companion.stats)
    .map(([n, v]) => `${n}: ${v}`)
    .join(', ')
  return [
    `${companion.name} — ${companion.species}${companion.shiny ? ' (shiny)' : ''} ${stars}`,
    `Hat: ${companion.hat} · Eye: ${companion.eye}`,
    `Stats: ${stats}`,
  ]
}

export async function doRelease(
  config: Config,
  setConfig: Dispatch<SetStateAction<Config>>,
): Promise<string[]> {
  const companion = getActiveCompanion()
  if (!companion) return ['No companion to release.']
  const name = companion.name
  const remaining = config.companions.filter(c => c.id !== config.activeCompanionId)
  const next: Config = {
    ...config,
    companions: remaining,
    activeCompanionId: remaining[0]?.id,
  }
  await saveGlobalConfig(next)
  setConfig(next)
  return [`${name} waved goodbye. 👋`]
}
