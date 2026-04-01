const PET_REACTIONS = [
  'purrs appreciatively',
  'does a tiny victory hop',
  'chirps and wiggles',
  'leans into the scritch',
  'wags its tail',
]

const NAME_REACTIONS = [
  'tilts its head',
  'blinks and listens',
  'perk ears up',
  'gives a tiny nod',
  'shuffles closer',
]

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

export function pickPetReaction(): string {
  return pick(PET_REACTIONS)
}

export function pickNameReaction(name: string): string {
  return `${name} ${pick(NAME_REACTIONS)}`
}

export function findNameReaction(input: string, name: string): string | null {
  if (!name) return null
  const normalized = input.toLowerCase()
  if (!normalized.includes(name.toLowerCase())) return null
  return pickNameReaction(name)
}
