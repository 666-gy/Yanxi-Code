import { useState } from 'react'
import { Cpu, Palette, Image as ImageIcon, Trash2, Key, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSettings, MODEL_OPTIONS, DEEPSEEK_BASE_URL, type ModelId } from '../../store/settingsStore'
import { api } from '../../services/ipc'
import { useToast } from '../../store/toastStore'
import '../Sidebar/RightSidebar.css'

type Tab = 'model' | 'appearance'

export function SettingsPanel() {
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

  const onPickImage = async () => {
    const p = await api.fs.pickImage()
    if (p) {
      // 转为 file:// URL 用于 <img> 显示
      const fileUrl = 'file:///' + p.replace(/\\/g, '/')
      setBackgroundImage(fileUrl)
      push('已设置背景图片', 'info')
    }
  }

  return (
    <div>
      {/* Tab 切换 */}
      <div className="settings-tabs">
        <button className={`settings-tab ${tab === 'model' ? 'is-active' : ''}`} onClick={() => setTab('model')}>
          <Cpu size={13} /> 模型配置
        </button>
        <button className={`settings-tab ${tab === 'appearance' ? 'is-active' : ''}`} onClick={() => setTab('appearance')}>
          <Palette size={13} /> 外观
        </button>
      </div>

      {tab === 'model' && (
        <>
          <section className="settings-section">
            <h4 className="settings-section__title"><Key size={12} /> API 服务</h4>

            <div className="settings-field">
              <label className="settings-label">
                API Key
                {apiKey
                  ? <span className="settings-status settings-status--ok"><CheckCircle2 size={10} />已配置</span>
                  : <span className="settings-status settings-status--warn"><AlertCircle size={10} />未配置</span>}
              </label>
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
  )
}
