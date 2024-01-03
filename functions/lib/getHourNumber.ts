export function getHourNumber(): number {
 const begin2024 = new Date(
  'January 1, 2024 00:00:00 GMT'
 )
 const now = new Date()
 const msPerHour = 1000 * 60 * 60
 return Math.floor(
  (now.getTime() - begin2024.getTime()) /
   msPerHour
 )
}
