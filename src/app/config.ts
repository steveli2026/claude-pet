import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { SALT } from '../buddy/companion.js'
import type { StoredCompanion } from '../buddy/types.js'

export type Config = {
  companions: StoredCompanion[]
  activeCompanionId?: string
  userId?: string
}

const DEFAULT_CONFIG: Config = {
  companions: [],
  activeCompanionId: undefined,
  userId: undefined,
}

const DATA_DIR = path.resolve(process.cwd(), '.data')
const CONFIG_PATH = path.join(DATA_DIR, 'companion.json')

let globalConfig: Config = { ...DEFAULT_CONFIG }

export function getConfigPath(): string {
  return CONFIG_PATH
}

export function getGlobalConfig(): Config {
  return globalConfig
}

export function setGlobalConfig(next: Config): void {
  globalConfig = { ...DEFAULT_CONFIG, ...next }
}

export function resolveUserId(): string {
  return (
    globalConfig.userId ||
    process.env.BUDDY_USER_ID ||
    os.userInfo().username ||
    'anon'
  )
}

// Migrate legacy single-companion config to multi-companion format
function migrateLegacy(parsed: Record<string, unknown>): Config {
  const legacy = parsed.companion as { name: string; personality: string; hatchedAt: number }
  if (!legacy) return { ...DEFAULT_CONFIG, userId: parsed.userId as string | undefined }
  const id = crypto.randomUUID()
  const migrated: StoredCompanion = {
    name: legacy.name,
    personality: legacy.personality,
    hatchedAt: legacy.hatchedAt,
    id,
    seed: resolveUserId() + SALT,
  }
  return {
    companions: [migrated],
    activeCompanionId: id,
    userId: parsed.userId as string | undefined,
  }
}

export async function loadGlobalConfig(): Promise<Config> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>

    // Detect legacy format (has `companion` field, no `companions` array)
    if ('companion' in parsed && !('companions' in parsed)) {
      const migrated = migrateLegacy(parsed)
      setGlobalConfig(migrated)
      // Persist the migrated format
      await fs.writeFile(CONFIG_PATH, JSON.stringify(migrated, null, 2), 'utf8')
    } else {
      setGlobalConfig(parsed as unknown as Config)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    }
  }
  return getGlobalConfig()
}

export async function saveGlobalConfig(next: Config): Promise<void> {
  setGlobalConfig(next)
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(globalConfig, null, 2), 'utf8')
}
