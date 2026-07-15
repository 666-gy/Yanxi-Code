export const basename = (p: string) => p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
export const dirname = (p: string) => {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/)
  parts.pop()
  return parts.join('\\')
}
