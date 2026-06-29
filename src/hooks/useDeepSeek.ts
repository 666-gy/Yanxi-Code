import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';

const SYSTEM_PROMPT = `你是一位耐心的编程导师，专门帮助初学者理解代码。请用中文，用通俗易懂的方式解释代码。

请严格按照以下三段式结构回答：

## 做了什么
用一句话总结这段代码的功能。

## 知识点
列出这段代码涉及的关键编程知识点（3-5条），每条用简短的话解释。

## 为什么这样写
解释这段代码的设计思路，为什么要这样写，有没有其他写法可以对比。

注意：
- 用初学者能听懂的话，避免太专业的术语
- 如果涉及语法细节，简单解释一下
- 语气友好、鼓励性的
- 不要太冗长，简洁明了`;

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
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

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
