import { describe, it, expect } from 'vitest'
import { buildYanAgentLaunchArgs, parseOpenWorkspaceArg, resolveViaPathLookup } from '../../main/utils/agent-launcher'

describe('resolveViaPathLookup', () => {
  it('returns null or a string without throwing', () => {
    const hit = resolveViaPathLookup()
    expect(hit === null || typeof hit === 'string').toBe(true)
  })
})

describe('parseOpenWorkspaceArg', () => {
  it('returns undefined when flag is absent', () => {
    expect(parseOpenWorkspaceArg(['electron.exe', '.'])).toBeUndefined()
  })

  it('returns empty string when flag has no value', () => {
    expect(parseOpenWorkspaceArg(['Yan Agent.exe', '--open-workspace'])).toBe('')
  })

  it('returns workspace path after flag', () => {
    expect(parseOpenWorkspaceArg(['Yan Agent.exe', '--open-workspace', 'C:\\proj']))
      .toBe('C:\\proj')
  })
})

describe('buildYanAgentLaunchArgs', () => {
  it('passes workspace and request identity to Yan Agent', () => {
    expect(buildYanAgentLaunchArgs('C:\\project A', 'yanxi_request_1')).toEqual([
      '--open-workspace',
      'C:\\project A',
      '--yanxi-request-id',
      'yanxi_request_1',
      '--show-main',
    ])
  })

  it('opens Yan Agent without clearing its workspace when the IDE has none', () => {
    expect(buildYanAgentLaunchArgs(null, 'yanxi_request_2')).toEqual(['--show-main'])
  })
})
