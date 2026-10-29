export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function nextDeliveryReference(existingReferences: string[]): string {
  const year = new Date().getFullYear()
  const prefix = `BT-DEL-${year}-`
  let max = 40
  for (const ref of existingReferences) {
    if (!ref.startsWith(prefix)) continue
    const num = Number(ref.slice(prefix.length))
    if (!Number.isNaN(num) && num > max) max = num
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}
