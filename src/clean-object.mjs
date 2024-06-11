export default function cleanObject (obj) {
  const kvList = Object.entries(obj).filter(
    ([key, value]) => value !== undefined
  )
  return kvList.length ? Object.fromEntries(kvList) : undefined
}
