import camelCase from 'pixutil/camel-case'
import guess from 'pixutil/guess'

export default function parseElement (elem) {
  return Object.fromEntries(
    elem.children
      .map(child => {
        if (typeof child === 'string') return undefined
        const key = camelCase(child.type)
        const value =
          typeof child.children[0] === 'string' ? guess(child.text) : child
        return [key, value]
      })
      .filter(Boolean)
  )
}
