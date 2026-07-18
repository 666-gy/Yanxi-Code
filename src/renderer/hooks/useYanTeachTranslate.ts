import { useCallback, useRef } from 'react'
import { DEEPSEEK_BASE_URL } from '../store/settingsStore'
import { useSettings } from '../store/settingsStore'
import { useYanTeach, type TeachRecord, type TeachScope } from '../store/yanTeachStore'
import { useWorkspace } from '../store/workspaceStore'
import { useToast } from '../store/toastStore'
import { saveTeachMarkdown, openTeachMarkdownInEditor } from '../services/yanTeachFiles'

const SELECTION_PROMPT = `你是一位资深编程导师，正在给学生讲解代码。请用中文解释用户选中的代码。

要求：
- 先一句话概括这段代码在做什么
- 然后逐行或逐块简洁解释，言简意赅、直击要点
- 涉及关键语法、API 或概念时简要说明
- 使用 Markdown 格式，代码用反引号或代码块标注
- 不要啰嗦，但务必讲完整，不要为字数刻意截断`

const FILE_PROMPT = `你是一位资深编程导师。请用中文概览并讲解用户提供的完整源文件。

要求：
- 用户已提供文件的完整源码，请基于全部内容分析，不要遗漏后半部分
- 先用 2-3 句话说明整体职责与结构
- 再按逻辑块（函数/类/模块）简要说明，言简意赅
- 指出关键依赖、入口和值得注意的设计
- 使用 Markdown 格式，必要时用短代码片段辅助说明
- 完整讲清楚，不要为字数刻意截断`

/** 整文件翻译：尽量发送完整源码；超大文件才截断 */
const FILE_MAX_CHARS = 400_000
/** 选中片段上限（通常远小于此） */
const SELECTION_MAX_CHARS = 50_000

export interface TranslateMeta {
  filePath: string
  fileName: string
  startLine?: number
  endLine?: number
  scope?: TeachScope
}

function prepareCodeForApi(code: string, scope: TeachScope): { text: string; truncated: boolean } {
  const trimmed = code.trim()
  const limit = scope === 'file' ? FILE_MAX_CHARS : SELECTION_MAX_CHARS
  if (trimmed.length <= limit) return { text: trimmed, truncated: false }
  return { text: trimmed.slice(0, limit), truncated: true }
}

export function useYanTeachTranslate() {
  const apiKey = useSettings((s) => s.apiKey)
  const model = useSettings((s) => s.model)
  const openPanel = useYanTeach((s) => s.openPanel)
  const setStreamingText = useYanTeach((s) => s.setStreamingText)
  const appendStreamingText = useYanTeach((s) => s.appendStreamingText)
  const setIsTranslating = useYanTeach((s) => s.setIsTranslating)
  const setAiStatus = useYanTeach((s) => s.setAiStatus)
  const addRecord = useYanTeach((s) => s.addRecord)
  const updateRecord = useYanTeach((s) => s.updateRecord)
  const push = useToast((s) => s.push)
  const abortRef = useRef<AbortController | null>(null)

  const translate = useCallback(async (
    code: string,
    language: string,
    meta: TranslateMeta
  ): Promise<{ ok: true; mdPath?: string } | { ok: false; error: string }> => {
    const scope = meta.scope ?? 'selection'

    openPanel()

    if (!apiKey) {
      return { ok: false, error: '请先在设置中配置 DeepSeek API Key' }
    }

    const trimmed = code.trim()
    if (!trimmed) {
      return { ok: false, error: '没有可讲解的代码内容' }
    }

    const { text: codeForApi, truncated } = prepareCodeForApi(trimmed, scope)
    if (truncated) {
      push(`文件较大，已截取前 ${scope === 'file' ? FILE_MAX_CHARS : SELECTION_MAX_CHARS} 字符发送给 AI`, 'warn')
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setIsTranslating(true)
    setAiStatus('thinking')
    setStreamingText('')

    const systemPrompt = scope === 'file' ? FILE_PROMPT : SELECTION_PROMPT
    const userPrompt = scope === 'file'
      ? `请讲解以下完整 ${language} 文件（共 ${trimmed.split('\n').length} 行）：\n\n\`\`\`${language}\n${codeForApi}\n\`\`\``
      : `请解释以下${language}代码：\n\n\`\`\`${language}\n${codeForApi}\n\`\`\``

    try {
      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
          temperature: 0.3,
          max_tokens: scope === 'file' ? 8192 : 4096
        }),
        signal: abortRef.current.signal
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`API 请求失败 (${response.status})${errText ? `: ${errText.slice(0, 120)}` : ''}`)
      }

      setAiStatus('streaming')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('无法读取响应流')

      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue
          const dataStr = trimmedLine.slice(5).trim()
          if (dataStr === '[DONE]') continue
          try {
            const data = JSON.parse(dataStr)
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              appendStreamingText(content)
              fullContent += content
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }

      if (fullContent) {
        const lineCount = trimmed.split('\n').length
        const record: TeachRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filePath: meta.filePath,
          fileName: meta.fileName,
          startLine: meta.startLine ?? 1,
          endLine: meta.endLine ?? lineCount,
          // 整文件：MD 不写源码，记录里也不存
          code: scope === 'selection' ? codeForApi : '',
          translation: fullContent,
          timestamp: Date.now(),
          scope,
          language
        }
        addRecord(record)

        const workspaceRoot = useWorkspace.getState().root
        if (workspaceRoot) {
          const mdPath = await saveTeachMarkdown(workspaceRoot, record, language)
          updateRecord(record.id, { mdPath })
          await openTeachMarkdownInEditor(mdPath)
          setAiStatus('idle')
          return { ok: true, mdPath }
        }

        setAiStatus('idle')
        return { ok: true }
      }

      setAiStatus('idle')
      return { ok: true }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAiStatus('idle')
        return { ok: false, error: '已取消' }
      }
      const message = err instanceof Error ? err.message : '未知错误'
      setStreamingText(`⚠️ 讲解失败：${message}`)
      setAiStatus('error')
      return { ok: false, error: message }
    } finally {
      setIsTranslating(false)
      abortRef.current = null
    }
  }, [
    apiKey, model, openPanel, setStreamingText, appendStreamingText,
    setIsTranslating, setAiStatus, addRecord, updateRecord, push
  ])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  return { translate, cancel }
}
