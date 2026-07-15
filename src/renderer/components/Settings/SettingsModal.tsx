import { useState } from 'react'
import { Cpu, Palette, Image as ImageIcon, Trash2, Key, Lock, CheckCircle2, AlertCircle, X, Save } from 'lucide-react'
import { useSettings, MODEL_OPTIONS, DEEPSEEK_BASE_URL, type ModelId } from '../../store/settingsStore'
import { useUi } from '../../store/uiStore'
import { api } from '../../services/ipc'
import { useToast } from '../../store/toastStore'
import './SettingsModal.css'

type Tab = 'model' | 'appearance'

export function SettingsModal() {
  const settingsOpen = useUi(s => s.settingsOpen)
  const setSettingsOpen = useUi(s => s.setSettingsOpen)
  const [tab, setTab] = useState<Tab>('model')
  const apiKey = useSettings(s => s.apiKey)
  const model = useSettings(s => s.model)
  const setApiKey = useSettings(s => s.setApiKey)
  const setModel = useSettings(s => s.setModel)
  const backgroundImage = useSettings(s => s.backgroundImage)
  const backgroundOpacity = useSettings(s => s.backgroundOpacity)
  const setBackgroundImage = useSettings(s => s.setBackgroundImage)
  const setBackgroundOpacity = useSettings(s => s.setBackgroundOpacity)
  const push = useToast(s => s.push)

  if (!settingsOpen) return null

  const onPickImage = async () => {
    try {
      const p = await api.fs.pickImage()
      if (!p) return
      // 将 Windows 路径转为 file:// URL
      const fileUrl = 'file:///' + p.replace(/\\/g, '/').replace(/^\//, '')
      setBackgroundImage(fileUrl)
      push('已设置背景图片', 'info')
    } catch (err: any) {
      push(`选择图片失败: ${err?.message ?? err}`, 'error')
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Cpu }[] = [
    { id: 'model', label: '模型配置', icon: Cpu },
    { id: 'appearance', label: '外观设置', icon: Palette },
  ]

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* 左侧导航 */}
        <div className="settings-modal__nav">
          <div className="settings-modal__nav-head">
            <span className="settings-modal__nav-title">设置</span>
          </div>
          <div className="settings-modal__nav-list">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  className={`settings-modal__nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="settings-modal__content">
          <div className="settings-modal__header">
            <h3 className="settings-modal__title">{tabs.find(t => t.id === tab)?.label}</h3>
            <button className="settings-modal__close" onClick={() => setSettingsOpen(false)} title="关闭">
              <X size={16} />
            </button>
          </div>

          <div className="settings-modal__body">
            {tab === 'model' && (
              <>
                <section className="settings-section">
                  <h4 className="settings-section__title"><Key size={12} /> API 服务</h4>

                  <div className="settings-field">
                    <div className="settings-label-row">
                      <label className="settings-label">API Key</label>
                      {apiKey
                        ? <span className="settings-status settings-status--ok"><CheckCircle2 size={10} />已配置</span>
                        : <span className="settings-status settings-status--warn"><AlertCircle size={10} />未配置</span>}
                    </div>
                    <input
                      type="password"
                      className="settings-input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxx"
                    />
                    <p className="settings-hint">在 platform.deepseek.com 获取。密钥仅保存在本地，不上传任何服务器。</p>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">API 地址 <Lock size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /></label>
                    <input className="settings-input settings-input--locked" value={DEEPSEEK_BASE_URL} readOnly />
                    <p className="settings-hint">DeepSeek 官方接口，已锁定不可修改。</p>
                  </div>
                </section>

                <section className="settings-section">
                  <h4 className="settings-section__title"><Cpu size={12} /> 模型选择</h4>
                  <div className="settings-model-grid">
                    {MODEL_OPTIONS.map((m) => (
                      <div
                        key={m.id}
                        className={`settings-model-card ${model === m.id ? 'is-active' : ''}`}
                        onClick={() => setModel(m.id as ModelId)}
                      >
                        <div className="settings-model-card__name">{m.label}</div>
                        <div className="settings-model-card__desc">{m.description}</div>
                      </div>
                    ))}
                  </div>
                  <p className="settings-hint" style={{ marginTop: 8 }}>仅支持 DeepSeek V4 系列，模型 ID 锁定。</p>
                </section>
              </>
            )}

            {tab === 'appearance' && (
              <>
                <section className="settings-section">
                  <h4 className="settings-section__title"><ImageIcon size={12} /> 自定义背景</h4>
                  <div className="settings-field">
                    <button className="settings-btn" onClick={onPickImage}>
                      <ImageIcon size={14} />
                      {backgroundImage ? '更换图片' : '选择图片'}
                    </button>
                    {backgroundImage && (
                      <button className="settings-btn settings-btn--danger" style={{ marginTop: 8 }} onClick={() => { setBackgroundImage(null); push('已移除背景', 'info') }}>
                        <Trash2 size={14} /> 移除背景
                      </button>
                    )}
                    <div className="settings-preview">
                      {backgroundImage
                        ? <img src={backgroundImage} alt="背景预览" />
                        : <div className="settings-preview__empty">未设置背景图片</div>}
                    </div>
                  </div>
                </section>

                <section className="settings-section">
                  <h4 className="settings-section__title"><Palette size={12} /> 背景透明度</h4>
                  <div className="settings-field">
                    <div className="settings-slider-row">
                      <input
                        type="range"
                        className="settings-slider"
                        min="0"
                        max="1"
                        step="0.05"
                        value={backgroundOpacity}
                        onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                      />
                      <span>{Math.round(backgroundOpacity * 100)}%</span>
                    </div>
                    <p className="settings-hint">控制背景图层在编辑器区域的可见度。0% 完全隐藏，100% 完全显示。</p>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="settings-modal__footer">
            <button className="modal__btn" onClick={() => setSettingsOpen(false)}>取消</button>
            <button className="modal__btn modal__btn--primary" onClick={() => { setSettingsOpen(false); push('设置已保存', 'info') }}>
              <Save size={14} /> 保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
