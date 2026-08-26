export const DAY_COUNT = 7

export function buildTimeOptions(): string[] {
  const times: string[] = []
  for (let hour = 8; hour <= 17; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 17 && minute === 30) continue
      const period = hour < 12 ? 'AM' : 'PM'
      const displayHour = hour > 12 ? hour - 12 : hour
      times.push(`${String(displayHour).padStart(2, '0')}:${minute === 0 ? '00' : '30'} ${period}`)
    }
  }
  return times
}

export const TIME_OPTIONS = buildTimeOptions()

export type DayColumn = { iso: string; headerLabel: string; absoluteLabel: string }

export function buildDayColumns(): DayColumn[] {
  const now = new Date()
  const columns: DayColumn[] = []
  for (let i = 0; i < DAY_COUNT; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const absoluteLabel = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
    const headerLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : absoluteLabel
    columns.push({ iso, headerLabel, absoluteLabel })
  }
  return columns
}
