const begin2024 = new Date(
 'January 1, 2024 00:00:00 GMT'
)
const ONE_HOUR_MS = 60 * 60 * 1000

export function getHourNumber(): number {
 const begin2024 = new Date(
  'January 1, 2024 00:00:00 GMT'
 )
 const now = new Date()
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   ONE_HOUR_MS
 )
}

export function getHourTimestamp(
 hourNumber: number
) {
 return (
  begin2024.getTime() + hourNumber * ONE_HOUR_MS
 )
}
