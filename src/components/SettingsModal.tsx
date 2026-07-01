import { useState } from 'react';
import { X, Key, Zap, Clock, Palette, Eye, Save } from 'lucide-react';
import { useStore } from '../store/useStore';

export function SettingsModal() {
  const { settingsOpen, closeSettings, settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);

  if (!settingsOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    closeSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cyber-950/80 backdrop-blur-sm animate-fade-in"
        onClick={closeSettings}
      />
      
      <div className="relative w-[520px] max-h-[80vh] bg-cyber-800 rounded-xl border border-cyber-600 shadow-2xl overflow-hidden animate-slide-in-up">
        <div className="h-14 border-b border-cyber-700 flex items-center justify-between px-5">
          <h2 className="text-lg font-semibold text-scholar-text flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            设置
          </h2>
          <button
            onClick={closeSettings}
            className="p-1.5 rounded-md hover:bg-cyber-700 transition-colors text-scholar-muted hover:text-scholar-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(80vh-3.5rem-4rem)]">
          <section>
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
              <Key size={16} />
              DeepSeek API
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-scholar-muted block mb-1.5">API Key</label>
                <input
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, apiKey: e.target.value })
                  }
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-text placeholder-scholar-subtle focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-scholar-muted block mb-1.5">API 地址</label>
                <input
                  type="text"
                  value={localSettings.apiBase}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, apiBase: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-text placeholder-scholar-subtle focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-scholar-muted block mb-1.5">模型</label>
                <select
                  value={localSettings.model}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, model: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-text focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                >
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="deepseek-reasoner">deepseek-reasoner</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
              <Clock size={16} />
              翻译设置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-scholar-muted block mb-1.5">
                  自动翻译触发延迟：{localSettings.debounceMs}ms
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={localSettings.debounceMs}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      debounceMs: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-scholar-subtle mt-1">
                  <span>快（200ms）</span>
                  <span>慢（2000ms）</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-scholar-text">自动翻译</p>
                  <p className="text-xs text-scholar-subtle">换行时自动翻译上一行代码</p>
                </div>
                <button
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      autoTranslate: !localSettings.autoTranslate,
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    localSettings.autoTranslate ? 'bg-amber-500' : 'bg-cyber-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      localSettings.autoTranslate ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
              <Palette size={16} />
              外观
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-scholar-muted" />
                <span className="text-sm text-scholar-text">主题</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocalSettings({ ...localSettings, theme: 'dark' })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    localSettings.theme === 'dark'
                      ? 'bg-amber-500 text-cyber-950 font-medium'
                      : 'bg-cyber-700 text-scholar-muted hover:bg-cyber-600'
                  }`}
                >
                  深色
                </button>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, theme: 'light' })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    localSettings.theme === 'light'
                      ? 'bg-amber-500 text-cyber-950 font-medium'
                      : 'bg-cyber-700 text-scholar-muted hover:bg-cyber-600'
                  }`}
                >
                  浅色
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="h-16 border-t border-cyber-700 flex items-center justify-end gap-3 px-5">
          <button
            onClick={closeSettings}
            className="px-4 py-2 rounded-lg text-sm text-scholar-muted hover:text-scholar-text hover:bg-cyber-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-cyber-950 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Save size={16} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
