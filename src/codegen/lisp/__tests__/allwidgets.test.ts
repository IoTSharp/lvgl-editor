import { describe, it, expect } from 'vitest'
import { generateCode } from '../index'
import { componentDefinitions } from '../../../utils/componentDefinitions'
import { createComponent, createPage, createTheme } from '../../__tests__/helpers'

function balanced(s: string): boolean {
  let d = 0, inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === ';') while (i < s.length && s[i] !== '\n') i++
    else if (c === '(') d++
    else if (c === ')') { d--; if (d < 0) return false }
  }
  return d === 0 && !inStr
}

describe('every widget type', () => {
  it('generates balanced Lisp', () => {
    const comps = componentDefinitions.map((d, i) => createComponent(d.type as never, { id: `c${i}`, name: `w_${i}` }))
    const page = createPage({ components: comps } as never)
    const out = generateCode([page], {} as never, [], createTheme(), [], [], '', 14, {} as never)
    for (const [name, src] of Object.entries(out)) expect(balanced(src as string), name).toBe(true)
    expect(Object.keys(out)).toContain('main.lisp')
  })
})

import { NameResolver } from '../names'
describe('NameResolver', () => {
  it('resolves a component by id as well as by name', () => {
    const c = createComponent('label' as never, { id: '138d3865-afec', name: 'title' })
    const names = new NameResolver([createPage({ components: [c] } as never)], { namingStyle: 'kebab-case' } as never)
    expect(names.varByName('138d3865-afec')).toBe(names.varByName('title'))
    expect(names.compByName('138d3865-afec')).toBe(c)
  })
})
