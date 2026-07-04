import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { addApiUsage } from '../utils/apiUsage';

const SYSTEM_PROMPT = `你是一位编程助手。请用中文，用一句话简洁地解释用户给出的代码行在做什么。

要求：
- 只说这行代码的作用，不要展开讲知识点
- 不超过两句话，言简意赅
- 不要用标题、不要分点、不要用 Markdown 格式
- 如果是简单的赋值或声明，直接说"声明了xxx"或"给xxx赋值"即可
- 如果涉及函数调用，说它在做什么就行`;

const DEEP_SYSTEM_PROMPT = `你是一位资深编程导师，正在给学生做代码深度讲解。请用中文，非常详细地逐行解释这段代码。

请包含以下内容：
1. **整体功能概述** - 这段代码做了什么
2. **逐行详解** - 逐行或逐块解释每一行的作用
3. **核心知识点** - 涉及的语法、概念、API
4. **设计思路** - 为什么这样写，有什么好处
5. **注意事项** - 常见坑点、最佳实践

用 Markdown 格式，代码部分用代码块标注。`;

export function useDeepSeek() {
  const { settings, setTranslation, appendTranslation, setIsTranslating, setAIStatus } = useStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const translate = useCallback(async (
    code: string,
    language: string,
    mode: 'auto' | 'deep' = 'auto'
  ) => {
    if (!settings.apiKey) {
      setTranslation('> 请先在设置中配置 DeepSeek API Key 才能使用翻译功能哦～');
      setAIStatus('error');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsTranslating(true);
    setAIStatus('thinking');
    setTranslation('');

    const systemPrompt = mode === 'deep' ? DEEP_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const userPrompt = `请解释以下${language}代码：\n\n\`\`\`${language}\n${code}\n\`\`\``;

    try {
      const response = await fetch(`${settings.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          temperature: 0.7,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      setAIStatus('streaming');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              appendTranslation(content);
              fullContent += content;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 记录 API 用量
      const promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const completionTokens = Math.ceil(fullContent.length / 4);
      addApiUsage(settings.model, mode === 'deep' ? '深度翻译' : '逐行翻译', promptTokens, completionTokens);

      setAIStatus('idle');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAIStatus('idle');
      } else {
        setTranslation(`> ⚠️ 翻译出错了：${err.message}\n\n请检查 API Key 是否正确，或网络连接是否正常。`);
        setAIStatus('error');
      }
    } finally {
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  }, [settings, setTranslation, appendTranslation, setIsTranslating, setAIStatus]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { translate, cancel };
}
