import { describe, it, expect } from 'vitest'
import { isBinaryPath } from '../../shared/constants'

describe('isBinaryPath', () => {
  it('flags common image formats', () => {
    expect(isBinaryPath('a.png')).toBe(true)
    expect(isBinaryPath('b.jpg')).toBe(true)
    expect(isBinaryPath('c.gif')).toBe(true)
  })
  it('flags executables and archives', () => {
    expect(isBinaryPath('app.exe')).toBe(true)
    expect(isBinaryPath('lib.dll')).toBe(true)
    expect(isBinaryPath('arch.zip')).toBe(true)
  })
  it('does not flag source files', () => {
    expect(isBinaryPath('index.ts')).toBe(false)
    expect(isBinaryPath('readme.md')).toBe(false)
    expect(isBinaryPath('app.js')).toBe(false)
    expect(isBinaryPath('style.css')).toBe(false)
  })
})
