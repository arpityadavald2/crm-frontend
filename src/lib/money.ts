/** 12345 paise -> "₹123.45". Integer maths only, no floating point. */
export function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100)
  const rest = String(paise % 100).padStart(2, '0')
  return `₹${rupees.toLocaleString('en-IN')}.${rest}`
}

/** "1234.5" -> 123450 paise. Returns null when the text is not a valid amount. */
export function rupeesToPaise(text: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!m) return null
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return paise <= 1_000_000_000 ? paise : null
}
