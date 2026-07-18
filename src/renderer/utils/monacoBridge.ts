import type { editor as MonacoEditor } from 'monaco-editor'

let editorInstance: MonacoEditor.IStandaloneCodeEditor | null = null

export function setMonacoEditor(editor: MonacoEditor.IStandaloneCodeEditor | null): void {
  editorInstance = editor
}

export function getMonacoSelection(): { text: string; startLine: number; endLine: number } | null {
  const editor = editorInstance
  if (!editor) return null
  const selection = editor.getSelection()
  const model = editor.getModel()
  if (!selection || !model || selection.isEmpty()) return null
  return {
    text: model.getValueInRange(selection),
    startLine: selection.startLineNumber,
    endLine: selection.endLineNumber
  }
}
