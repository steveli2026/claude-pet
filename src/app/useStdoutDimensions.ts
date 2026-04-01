import { useEffect, useState } from 'react'
import { useStdout } from 'ink'

const FALLBACK_COLUMNS = 80
const FALLBACK_ROWS = 24

export function useStdoutDimensions(): [number, number] {
  const { stdout } = useStdout()
  const initial: [number, number] = [
    stdout?.columns ?? FALLBACK_COLUMNS,
    stdout?.rows ?? FALLBACK_ROWS,
  ]
  const [dims, setDims] = useState<[number, number]>(initial)

  useEffect(() => {
    if (!stdout) return undefined
    const update = () => {
      setDims([
        stdout.columns ?? FALLBACK_COLUMNS,
        stdout.rows ?? FALLBACK_ROWS,
      ])
    }
    update()
    stdout.on('resize', update)
    return () => {
      stdout.off('resize', update)
    }
  }, [stdout])

  return dims
}
