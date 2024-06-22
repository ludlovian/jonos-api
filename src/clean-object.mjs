export default function cleanObject (obj) {
  // defensive check
  /* c8 ignore next */
  const kvList = Object.entries(obj ?? {}).filter(
    ([key, value]) => value !== undefined
  )
  return kvList.length ? Object.fromEntries(kvList) : undefined
}
