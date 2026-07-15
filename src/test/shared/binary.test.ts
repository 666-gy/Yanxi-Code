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
  it('flags Windows shortcuts and docs', () => {
    expect(isBinaryPath('shortcut.lnk')).toBe(true)
    expect(isBinaryPath('web.url')).toBe(true)
    expect(isBinaryPath('doc.pdf')).toBe(true)
    expect(isBinaryPath('sheet.xlsx')).toBe(true)
  })
  it('does not flag source files', () => {
    expect(isBinaryPath('index.ts')).toBe(false)
    expect(isBinaryPath('readme.md')).toBe(false)
    expect(isBinaryPath('app.js')).toBe(false)
    expect(isBinaryPath('style.css')).toBe(false)
    expect(isBinaryPath('config.ini')).toBe(false)
    expect(isBinaryPath('app.py')).toBe(false)
  })
})
