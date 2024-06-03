import camelCase from 'pixutil/camelCase'
import convert from './convert.mjs'

export default function parseElement (elem) {
  return Object.fromEntries(
    elem.children
      .map(child => {
        if (typeof child === 'string') return undefined
        const key = camelCase(child.type)
        const value =
          typeof child.children[0] === 'string' ? convert(child.text) : child
        return [key, value]
      })
      .filter(Boolean)
  )
}
