export function guessLang(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', html: 'html', md: 'markdown', py: 'python',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
    java: 'java', kt: 'kotlin', go: 'go', rs: 'rust', rb: 'ruby',
    php: 'php', swift: 'swift', scss: 'scss', less: 'less',
    xml: 'xml', yaml: 'yaml', yml: 'yaml', sh: 'shell', bash: 'shell',
    sql: 'sql', dockerfile: 'dockerfile', makefile: 'makefile'
  }
  return map[ext] ?? 'plaintext'
}
