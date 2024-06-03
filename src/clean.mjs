export function cleanObject (obj) {
  const kvList = Object.entries(obj).filter(([k, v]) => v != null)
  return kvList.length ? Object.fromEntries(kvList) : undefined
}
