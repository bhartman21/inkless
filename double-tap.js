export function isDoubleTap(first, second) {
  if (!first) return false
  return (
    second.time - first.time < 300 &&
    Math.abs(second.x - first.x) < 20 &&
    Math.abs(second.y - first.y) < 20
  )
}
