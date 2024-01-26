export function randomId() {
 return '12345678'
  .split('')
  .map(() =>
   (Math.random() * 1e6)
    .toString(36)
    .replace('.', '')
    .slice(0, 4)
  )
  .join('')
}
