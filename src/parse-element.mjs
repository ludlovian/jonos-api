import camelCase from '@ludlovian/camel'

// parses an element into an object

export function parseElementTexts (elem, out = {}) {
  for (const el of elem.findAll(p => p.isText)) {
    const key = keyFromType(el.type)
    collectOnto(out, key, el.text)
  }
  return out
}

export function parseElementVals (elem, out = {}) {
  for (const el of elem.findAll(p => 'val' in p.attr)) {
    const key = keyFromType(el.type)
    const val = el.attr.val
    collectOnto(out, key, val)
    if (el.attr.channel) {
      collectOnto(out, `${key}:${el.attr.channel}`, val)
    }
  }
  return out
}

function keyFromType (type) {
  const ix = type.lastIndexOf(':')
  return ix === -1 ? camelCase(type) : camelCase(type.slice(ix + 1))
}

function collectOnto (out, key, text) {
  if (key in out) {
    const val = out[key]
    out[key] = Array.isArray(val) ? [...val, text] : [val, text]
  } else {
    out[key] = text
  }
}
