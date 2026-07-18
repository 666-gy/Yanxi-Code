export const basename = (p: string) => p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
export const dirname = (p: string) => {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/)
  parts.pop()
  return parts.join('\\')
}
export const joinPath = (base: string, ...parts: string[]) => {
  const sep = base.includes('\\') ? '\\' : '/'
  return [base.replace(/[/\\]+$/, ''), ...parts.map((p) => p.replace(/^[/\\]+/, ''))]
    .filter(Boolean)
    .join(sep)
}
export const samePath = (a: string, b: string) =>
  a.replace(/[/\\]+$/, '').toLowerCase() === b.replace(/[/\\]+$/, '').toLowerCase()
