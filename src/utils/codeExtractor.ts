import type { CodeBlock } from '../types';

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    html: 'html',
    css: 'css',
    md: 'markdown',
    json: 'json',
  };
  return map[ext || ''] || 'plaintext';
}

export function getMonacoLanguage(lang: string): string {
  const map: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
    html: 'html',
    css: 'css',
    markdown: 'markdown',
    json: 'json',
    plaintext: 'plaintext',
  };
  return map[lang] || 'plaintext';
}

export function extractCodeBlock(
  code: string,
  lineNumber: number,
  language: string
): CodeBlock {
  const lines = code.split('\n');
  const currentLineIdx = lineNumber - 1;
  
  if (currentLineIdx < 0 || currentLineIdx >= lines.length) {
    return { content: code, startLine: 1, endLine: lines.length, language };
  }

  const currentIndent = getIndentLevel(lines[currentLineIdx]);
  
  let startLine = currentLineIdx;
  let endLine = currentLineIdx;

  const isBlockStart = (line: string) => {
    if (language === 'python') {
      return line.trim().endsWith(':') && line.trim().length > 0;
    }
    return line.includes('{') && !line.includes('}');
  };

  if (language === 'python') {
    while (startLine > 0) {
      const prevLine = lines[startLine - 1];
      const prevIndent = getIndentLevel(prevLine);
      if (prevIndent < currentIndent && prevLine.trim() !== '') {
        break;
      }
      startLine--;
    }
    
    while (endLine < lines.length - 1) {
      const nextLine = lines[endLine + 1];
      const nextIndent = getIndentLevel(nextLine);
      if (nextLine.trim() !== '' && nextIndent < currentIndent) {
        break;
      }
      endLine++;
    }
    
    if (startLine > 0 && isBlockStart(lines[startLine - 1])) {
      startLine--;
    }
  } else {
    let braceCount = 0;
    let foundBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') braceCount++;
        if (ch === '}') braceCount--;
      }
      if (i <= currentLineIdx && braceCount > 0 && !foundBlock) {
        startLine = i;
        foundBlock = true;
      }
      if (foundBlock && i >= currentLineIdx && braceCount === 0) {
        endLine = i;
        break;
      }
    }
    
    if (!foundBlock) {
      startLine = Math.max(0, currentLineIdx - 10);
      endLine = Math.min(lines.length - 1, currentLineIdx + 10);
    }
  }

  const content = lines.slice(startLine, endLine + 1).join('\n');
  
  return {
    content,
    startLine: startLine + 1,
    endLine: endLine + 1,
    language,
  };
}

function getIndentLevel(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === ' ') count++;
    else if (ch === '\t') count += 4;
    else break;
  }
  return count;
}
