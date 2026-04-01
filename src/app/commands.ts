import crypto from 'node:crypto'
import type { Dispatch, SetStateAction } from 'react'
import { getActiveCompanion, getAllCompanions, rollWithSeed, SALT } from '../buddy/companion.js'
import {
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

function hatchCompanion(config: Config): StoredCompanion {
  const name = pick(NAMES)
  const id = crypto.randomUUID()
  const seed = `${resolveUserId()}:${SALT}:${Date.now()}`
  const { bones, inspirationSeed } = rollWithSeed(seed)
  const personality = generatePersonality(bones.species, inspirationSeed)
  return {
    name,
    personality,
    id,
    seed,
    hatchedAt: Date.now(),
  }
}

function formatCompanion(companion: Companion): string[] {
  const stars = RARITY_STARS[companion.rarity]
  const stats = Object.entries(companion.stats)
    .map(([name, value]) => `${name}: ${value}`)
    .join(', ')
  return [
    `Name: ${companion.name}`,
    `Species: ${companion.species}${companion.shiny ? ' (shiny)' : ''}`,
    `Rarity: ${companion.rarity} ${stars}`,
    `Hat: ${companion.hat}`,
    `Eye: ${companion.eye}`,
    `Stats: ${stats}`,
  ]
}

export async function runBuddyCommand(
  line: string,
  config: Config,
  setConfig: Dispatch<SetStateAction<Config>>,
  setAppState: Dispatch<SetStateAction<AppState>>,
): Promise<string[] | null> {
  const trimmed = line.trim()
  if (!trimmed.startsWith('/buddy')) return null

  const args = trimmed.split(/\s+/).slice(1)
  const sub = args[0]?.toLowerCase()

  if (!sub) {
    if (config.companions.length === 0) {
      // First hatch
      const soul = hatchCompanion(config)
      const next = { ...config, companions: [soul], activeCompanionId: soul.id }
      await saveGlobalConfig(next)
      setConfig(next)
      const companion = getActiveCompanion()
      if (!companion) return ['Hatch failed. Try again.']
      return [
        `${companion.name} hatched!`,
        `say its name to get its take · /buddy pet · /buddy hatch for more`,
      ]
    }
    return [
      'Commands: /buddy hatch | /buddy pet | /buddy name <name> | /buddy stats | /buddy list',
      'Use ←/→ arrows to switch between buddies.',
    ]
  }

  if (sub === 'hatch') {
    const soul = hatchCompanion(config)
    const companions = [...config.companions, soul]
    const next = { ...config, companions, activeCompanionId: soul.id }
    await saveGlobalConfig(next)
    setConfig(next)
    const { bones } = rollWithSeed(soul.seed)
    return [
      `${soul.name} the ${bones.species} hatched! (${bones.rarity} ${RARITY_STARS[bones.rarity]})`,
      `You now have ${companions.length} buddies. Use ←/→ to switch.`,
    ]
  }

  if (sub === 'pet') {
    if (config.companions.length === 0) {
      return ['No companion yet. Run /buddy to hatch.']
    }
    setAppState(prev => ({
      ...prev,
      companionPetAt: Date.now(),
      companionReaction: pickPetReaction(),
    }))
    return ['Your buddy seems delighted.']
  }

  if (sub === 'name') {
    if (config.companions.length === 0) return ['No companion yet. Run /buddy to hatch.']
    const nextName = args.slice(1).join(' ').trim()
    if (!nextName) return ['Usage: /buddy name <name>']
    const companions = config.companions.map(c =>
      c.id === config.activeCompanionId ? { ...c, name: nextName } : c,
    )
    const next = { ...config, companions }
    await saveGlobalConfig(next)
    setConfig(next)
    return [`Renamed to ${nextName}.`]
  }

  if (sub === 'stats') {
    const companion = getActiveCompanion()
    if (!companion) return ['No companion yet. Run /buddy to hatch.']
    return formatCompanion(companion)
  }

  if (sub === 'list') {
    const all = getAllCompanions()
    if (all.length === 0) return ['No companions yet. Run /buddy to hatch.']
    return all.map((c, i) => {
      const active = c.id === config.activeCompanionId ? '▸ ' : '  '
      const stars = RARITY_STARS[c.rarity]
      return `${active}${i + 1}. ${c.name} — ${c.species} ${stars}${c.shiny ? ' ✨' : ''}`
    })
  }

  return ['Unknown /buddy command. Try /buddy for help.']
}
