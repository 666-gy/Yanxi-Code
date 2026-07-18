import { useState } from 'react'
import { Cpu, Key, Lock, CheckCircle2, AlertCircle, X, Save, Info, Bot, GraduationCap } from 'lucide-react'
import { useSettings, MODEL_OPTIONS, DEEPSEEK_BASE_URL, type ModelId } from '../../store/settingsStore'
import { useUi } from '../../store/uiStore'
import { useToast } from '../../store/toastStore'
import logo from '../../assets/logo.svg'
import './SettingsModal.css'

type SettingsPage = 'model' | 'about'

export function SettingsModal() {
  const settingsOpen = useUi(s => s.settingsOpen)
  const setSettingsOpen = useUi(s => s.setSettingsOpen)
  const apiKey = useSettings(s => s.apiKey)
  const model = useSettings(s => s.model)
  const setApiKey = useSettings(s => s.setApiKey)
  const setModel = useSettings(s => s.setModel)
  const push = useToast(s => s.push)
  const [page, setPage] = useState<SettingsPage>('model')

  if (!settingsOpen) return null

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* 左侧导航 */}
        <div className="settings-modal__nav">
          <div className="settings-modal__nav-head">
            <span className="settings-modal__nav-title">设置</span>
          </div>
          <div className="settings-modal__nav-list">
            <button
              className={`settings-modal__nav-item ${page === 'model' ? 'is-active' : ''}`}
              onClick={() => setPage('model')}
            >
              <Cpu size={15} />
              <span>模型配置</span>
            </button>
            <button
              className={`settings-modal__nav-item ${page === 'about' ? 'is-active' : ''}`}
              onClick={() => setPage('about')}
            >
              <Info size={15} />
              <span>关于</span>
            </button>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="settings-modal__content">
          <div className="settings-modal__header">
            <h3 className="settings-modal__title">{page === 'model' ? '模型配置' : '关于'}</h3>
            <button className="settings-modal__close" onClick={() => setSettingsOpen(false)} title="关闭">
              <X size={16} />
            </button>
          </div>

          <div className="settings-modal__body">
            {page === 'model' ? (
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
            ) : (
              <section className="settings-about">
                <div className="settings-about__brand">
                  <img className="settings-about__logo" src={logo} alt="Yanxi Code" draggable={false} />
                  <div>
                    <h4 className="settings-about__name">Yanxi Code</h4>
                    <p className="settings-about__version">v1.3.0</p>
                  </div>
                </div>

                <p className="settings-about__intro">
                  Yanxi Code 是面向 Yanxi 双端工作流的轻量代码编辑器。它连接代码编辑与智能代理，
                  让工作区可以在 Yanxi Code 与 Yan Agent 之间顺畅互通。
                </p>

                <div className="settings-about__features">
                  <div className="settings-about__feature">
                    <Bot size={17} />
                    <div>
                      <strong>Yan Agent 双端互通</strong>
                      <span>从任一端发起工作区切换，并将当前项目交给另一端继续处理。</span>
                    </div>
                  </div>
                  <div className="settings-about__feature">
                    <GraduationCap size={17} />
                    <div>
                      <strong>Yan Teach 智能讲解</strong>
                      <span>使用 DeepSeek 讲解选中代码或完整文件，并保存为 Markdown 记录。</span>
                    </div>
                  </div>
                </div>

                <p className="settings-about__tagline">As coding as developing</p>
              </section>
            )}
          </div>

          <div className="settings-modal__footer">
            {page === 'model' ? (
              <>
                <button className="modal__btn" onClick={() => setSettingsOpen(false)}>取消</button>
                <button className="modal__btn modal__btn--primary" onClick={() => { setSettingsOpen(false); push('设置已保存', 'info') }}>
                  <Save size={14} /> 保存
                </button>
              </>
            ) : (
              <button className="modal__btn modal__btn--primary" onClick={() => setSettingsOpen(false)}>关闭</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
