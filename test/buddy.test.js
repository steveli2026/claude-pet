import test from 'node:test'
import assert from 'node:assert/strict'
import { roll, rollWithSeed } from '../dist/buddy/companion.js'
import { RARITIES, SPECIES, STAT_NAMES } from '../dist/buddy/types.js'
import { renderFace, renderSprite } from '../dist/buddy/sprites.js'

function setFrom(items) {
  return new Set(items)
}

test('roll is deterministic for the same user id', () => {
  const first = roll('user-1')
  const second = roll('user-1')
  assert.deepEqual(first, second)
})

test('roll varies for different user ids', () => {
  const first = roll('user-1')
  const second = roll('user-2')
  assert.notDeepEqual(first, second)
})

test('rollWithSeed is deterministic for the same seed', () => {
  const first = rollWithSeed('seed-1')
  const second = rollWithSeed('seed-1')
  assert.deepEqual(first, second)
})

test('roll outputs valid rarity/species/stats', () => {
  const { bones } = roll('user-3')
  const rarities = setFrom(RARITIES)
  const species = setFrom(SPECIES)

  assert.ok(rarities.has(bones.rarity))
  assert.ok(species.has(bones.species))
  for (const name of STAT_NAMES) {
    const value = bones.stats[name]
    assert.ok(typeof value === 'number')
    assert.ok(value >= 1)
    assert.ok(value <= 100)
  }
})

test('rendering includes eye glyph', () => {
  const { bones } = roll('user-4')
  const face = renderFace(bones)
  assert.ok(face.includes(bones.eye))

  const sprite = renderSprite(bones, 0)
  assert.ok(sprite.some(line => line.includes(bones.eye)))
})
