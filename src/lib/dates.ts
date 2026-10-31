/** Today's date in India time as YYYY-MM-DD (the backend uses India time too). */
export function todayInIndia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
