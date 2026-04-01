export function findBuddyTriggerPositions(text: string): Array<{
  start: number
  end: number
}> {
  const triggers: Array<{ start: number; end: number }> = []
  const re = /\/buddy\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    triggers.push({
      start: m.index,
      end: m.index + m[0].length,
    })
  }
  return triggers
}
