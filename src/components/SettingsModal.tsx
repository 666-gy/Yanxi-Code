import { useState, useEffect } from 'react';
import {
  X, Zap, Clock, Palette, Save, Image, Trash2, BarChart3, RefreshCw, Key, Cpu, Languages, Monitor,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { loadApiUsage, resetApiUsage } from '../utils/apiUsage';
import type { ApiUsage } from '../types';

type TabId = 'model' | 'translate' | 'appearance';

const tabs: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: 'model', label: '模型配置', icon: Cpu },
  { id: 'translate', label: '翻译设置', icon: Languages },
  { id: 'appearance', label: '外观设置', icon: Monitor },
];

export function SettingsModal() {
  const { settingsOpen, closeSettings, settings, updateSettings } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('model');
  const [localSettings, setLocalSettings] = useState(settings);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);

  useEffect(() => {
    if (settingsOpen) {
      setApiUsage(loadApiUsage());
      setLocalSettings(settings);
      setActiveTab('model');
    }
  }, [settingsOpen, settings]);

  const handleResetUsage = () => {
    if (confirm('确定要清空计费统计吗？此操作不可恢复。')) {
      resetApiUsage();
      setApiUsage(loadApiUsage());
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    closeSettings();
  };

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cyber-950/80 backdrop-blur-sm animate-fade-in"
        onClick={closeSettings}
      />

      <div className="relative w-[680px] h-[520px] bg-cyber-800 rounded-xl border border-cyber-600 shadow-2xl overflow-hidden animate-slide-in-up flex">
        {/* 左侧导航 */}
        <div className="w-48 border-r border-cyber-700 bg-cyber-900/50 flex flex-col">
          <div className="h-14 border-b border-cyber-700 flex items-center px-4">
            <h2 className="text-base font-semibold text-scholar-text flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              设置
            </h2>
          </div>
          <div className="flex-1 py-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all border-l-2 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500 font-medium'
                      : 'text-scholar-muted hover:bg-cyber-700/50 hover:text-scholar-text border-transparent'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-cyber-700 flex items-center justify-between px-5">
            <h3 className="text-sm font-medium text-scholar-text">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={closeSettings}
              className="p-1.5 rounded-md hover:bg-cyber-700 transition-colors text-scholar-muted hover:text-scholar-text"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'model' && (
              <div className="space-y-6">
                <section>
                  <h4 className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Key size={13} />
                    API 服务
                  </h4>
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
                        className="w-full px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-text placeholder-scholar-subtle focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
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
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            setLocalSettings({ ...localSettings, model: 'deepseek-v4-flash' })
                          }
                          className={`p-3 rounded-lg border text-left transition-all ${
                            localSettings.model === 'deepseek-v4-flash'
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-cyber-600 bg-cyber-900 hover:border-cyber-500'
                          }`}
                        >
                          <p className="text-sm font-medium text-scholar-text">V4 Flash</p>
                          <p className="text-[11px] text-scholar-subtle mt-1">
                            更快更便宜
                          </p>
                          <p className="text-[10px] text-amber-400/80 mt-1.5">
                            ¥1/M 输入 · ¥2/M 输出
                          </p>
                        </button>
                        <button
                          onClick={() =>
                            setLocalSettings({ ...localSettings, model: 'deepseek-v4-pro' })
                          }
                          className={`p-3 rounded-lg border text-left transition-all ${
                            localSettings.model === 'deepseek-v4-pro'
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-cyber-600 bg-cyber-900 hover:border-cyber-500'
                          }`}
                        >
                          <p className="text-sm font-medium text-scholar-text">V4 Pro</p>
                          <p className="text-[11px] text-scholar-subtle mt-1">
                            更强推理能力
                          </p>
                          <p className="text-[10px] text-amber-400/80 mt-1.5">
                            ¥3/M 输入 · ¥8/M 输出
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BarChart3 size={13} />
                      计费统计
                    </span>
                    <button
                      onClick={handleResetUsage}
                      className="text-[10px] text-scholar-subtle hover:text-red-400 transition-colors flex items-center gap-1 normal-case tracking-normal"
                    >
                      <RefreshCw size={11} />
                      重置
                    </button>
                  </h4>
                  {apiUsage && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-cyber-900 rounded-lg p-3 border border-cyber-700 text-center">
                          <p className="text-[10px] text-scholar-subtle mb-1">调用次数</p>
                          <p className="text-base font-semibold text-scholar-text">
                            {apiUsage.callCount}
                          </p>
                        </div>
                        <div className="bg-cyber-900 rounded-lg p-3 border border-cyber-700 text-center">
                          <p className="text-[10px] text-scholar-subtle mb-1">总 Token</p>
                          <p className="text-base font-semibold text-scholar-text">
                            {(apiUsage.totalTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                        <div className="bg-cyber-900 rounded-lg p-3 border border-cyber-700 text-center">
                          <p className="text-[10px] text-scholar-subtle mb-1">总花费</p>
                          <p className="text-base font-semibold text-amber-400">
                            ¥{apiUsage.totalCost.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      {Object.keys(apiUsage.featureUsages).length > 0 && (
                        <div>
                          <p className="text-[11px] text-scholar-muted mb-2">功能分布</p>
                          <div className="space-y-1.5">
                            {Object.entries(apiUsage.featureUsages).map(([feature, data]) => (
                              <div
                                key={feature}
                                className="flex items-center justify-between text-xs bg-cyber-900/50 rounded px-3 py-2"
                              >
                                <span className="text-scholar-text">{feature}</span>
                                <span className="text-amber-400 font-medium">
                                  ¥{data.cost.toFixed(4)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'translate' && (
              <div className="space-y-6">
                <section>
                  <h4 className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={13} />
                    翻译配置
                  </h4>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-scholar-muted block mb-2">
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
                    <div className="flex items-center justify-between p-3 bg-cyber-900/50 rounded-lg border border-cyber-700">
                      <div>
                        <p className="text-sm text-scholar-text">自动翻译</p>
                        <p className="text-xs text-scholar-subtle mt-0.5">
                          换行时自动翻译上一行代码
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setLocalSettings({
                            ...localSettings,
                            autoTranslate: !localSettings.autoTranslate,
                          })
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
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
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <section>
                  <h4 className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Palette size={13} />
                    背景设置
                  </h4>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-scholar-muted block mb-2 flex items-center gap-2">
                        <Image size={13} />
                        自定义背景
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (window.electronAPI) {
                              const result = await window.electronAPI.selectBackgroundImage();
                              if (result) {
                                setLocalSettings({ ...localSettings, backgroundImage: result });
                              }
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-muted hover:border-amber-500/50 hover:text-scholar-text transition-all flex items-center justify-center gap-2"
                        >
                          <Image size={15} />
                          {localSettings.backgroundImage ? '更换图片' : '上传图片'}
                        </button>
                        {localSettings.backgroundImage && (
                          <button
                            onClick={() => setLocalSettings({ ...localSettings, backgroundImage: null })}
                            className="px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-red-400 hover:border-red-500/50 transition-all flex items-center justify-center"
                            title="移除背景"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      {localSettings.backgroundImage && (
                        <div className="mt-3 w-full h-28 rounded-lg overflow-hidden border border-cyber-600 bg-cyber-900">
                          <img
                            src={localSettings.backgroundImage}
                            alt="背景预览"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-scholar-muted block mb-2">
                        背景透明度：{Math.round(localSettings.backgroundOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={localSettings.backgroundOpacity}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            backgroundOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-scholar-subtle mt-1">
                        <span>透明</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="h-14 border-t border-cyber-700 flex items-center justify-end gap-3 px-5">
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
              <Save size={15} />
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
