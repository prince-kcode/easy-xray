import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function SettingsModal({ isOpen, onClose }) {
  const { currentUser, settings, updateProfile, updateSettings } = useAuth()

  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    title: currentUser?.title || '',
    department: currentUser?.department || '',
  })
  const [settingsForm, setSettingsForm] = useState({
    hospitalName: settings?.hospitalName || '',
    department: settings?.department || '',
    confidenceThreshold: settings?.confidenceThreshold || 75,
    heatmapColormap: settings?.heatmapColormap || 'Jet',
    autoReportGeneration: settings?.autoReportGeneration ?? true,
    emailAlerts: settings?.emailAlerts ?? true,
  })
  const [savedNotice, setSavedNotice] = useState(false)

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    updateProfile(profileForm)
    updateSettings(settingsForm)
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
      onClose()
    }, 900)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <div className="modal-title">System & Account Settings</div>
              <div className="modal-sub">Configure user profile and diagnostic preferences</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {savedNotice && (
          <div className="alert alert-success" style={{ margin: '14px 20px 0' }}>
            <span>✓</span> Settings successfully updated and saved!
          </div>
        )}

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile & Account
          </button>
          <button
            className={`modal-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🧠 AI & Diagnostics
          </button>
          <button
            className={`modal-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            🏥 Hospital & System
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {activeTab === 'profile' && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, padding: 12, background: 'rgba(26,115,232,0.06)', borderRadius: 10 }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                  {currentUser?.avatar || 'DR'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{currentUser?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Role: <span className="badge badge-blue" style={{ textTransform: 'uppercase' }}>{currentUser?.role}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Designation / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileForm.title}
                    onChange={e => setProfileForm({ ...profileForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileForm.department}
                    onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="fade-in">
              <div className="form-group">
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    AI Minimum Confidence Threshold
                  </label>
                  <span className="mono text-cyan" style={{ fontSize: 13, fontWeight: 700 }}>
                    {settingsForm.confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  className="w-full"
                  value={settingsForm.confidenceThreshold}
                  onChange={e => setSettingsForm({ ...settingsForm, confidenceThreshold: Number(e.target.value) })}
                  style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Predictions below this threshold will be flagged as Moderate/Review Required.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Grad-CAM Heatmap Colormap</label>
                <select
                  className="form-control"
                  value={settingsForm.heatmapColormap}
                  onChange={e => setSettingsForm({ ...settingsForm, heatmapColormap: e.target.value })}
                >
                  <option value="Jet">Jet (Medical Standard Blue-Yellow-Red)</option>
                  <option value="Turbo">Turbo (High Perceptual Contrast)</option>
                  <option value="Inferno">Inferno (Deep Heat Thermal)</option>
                  <option value="Viridis">Viridis (Colorblind Safe)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={settingsForm.autoReportGeneration}
                    onChange={e => setSettingsForm({ ...settingsForm, autoReportGeneration: e.target.checked })}
                    style={{ accentColor: 'var(--accent-cyan)', width: 16, height: 16 }}
                  />
                  <span>Automatically generate PDF clinical diagnostic reports on analysis</span>
                </label>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={settingsForm.emailAlerts}
                    onChange={e => setSettingsForm({ ...settingsForm, emailAlerts: e.target.checked })}
                    style={{ accentColor: 'var(--accent-cyan)', width: 16, height: 16 }}
                  />
                  <span>Dispatch critical triage notification for Severe COVID-19/Pneumonia</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="fade-in">
              <div className="form-group">
                <label className="form-label">Hospital / Health Center Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={settingsForm.hospitalName}
                  onChange={e => setSettingsForm({ ...settingsForm, hospitalName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medical Division</label>
                <input
                  type="text"
                  className="form-control"
                  value={settingsForm.department}
                  onChange={e => setSettingsForm({ ...settingsForm, department: e.target.value })}
                />
              </div>

              <div className="card" style={{ background: 'rgba(5,13,26,0.6)', padding: 14, marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 6 }}>
                  System Diagnostics & AI Engine
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div>• AI Core: <span className="mono">ResNet-50 Custom Transfer Model</span></div>
                  <div>• Visual Explainability: <span className="mono">Grad-CAM (Layer 4 Target)</span></div>
                  <div>• Gatekeeper Validator: <span className="mono">Binary ResNet X-Ray Detector</span></div>
                  <div>• Backend: <span className="mono">Django REST Framework 5.x</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-cyan">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

