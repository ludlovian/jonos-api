import Parsley from 'parsley'

export default function convert (x) {
  if (x == null) return x
  const num = +x
  if (!isNaN(x)) return num
  if (typeof x !== 'string') return x
  if (x.startsWith('<') && x.endsWith('>')) {
    const p = Parsley.from(x, { safe: true })
    if (p) return p
  }
  return x
}
