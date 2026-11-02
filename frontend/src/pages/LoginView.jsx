import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginView() {
  const { login, demoAccounts } = useAuth()
  const [selectedRole, setSelectedRole] = useState('doctor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleQuickLogin = (role) => {
    login(role)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please provide an email address.')
      return
    }
    // Custom login with chosen role
    login({
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: email.split('@')[0].toUpperCase(),
      role: selectedRole,
      email: email,
      title: selectedRole === 'doctor' ? 'Staff Physician' : (selectedRole === 'admin' ? 'System Administrator' : 'Patient User'),
      department: selectedRole === 'patient' ? 'Outpatient' : 'Clinical Health',
      avatar: email.slice(0, 2).toUpperCase(),
    })
  }

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-brand">
          <div className="sidebar-logo" style={{ width: 56, height: 56, fontSize: 28, margin: '0 auto 12px' }}>
            🫁
          </div>
          <h1 className="login-title">Easy X-Ray</h1>
          <p className="login-sub">AI-Powered Multi-Role Diagnostic System</p>
        </div>

        <div className="login-role-selector">
          <div className="login-role-header">Select Role to Sign In:</div>
          <div className="role-cards-grid">
            <div
              className={`role-select-box ${selectedRole === 'doctor' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('doctor'); handleQuickLogin('doctor'); }}
            >
              <div className="role-icon">🩺</div>
              <div className="role-name">Doctor Portal</div>
              <div className="role-desc">Analyze scans, triage X-rays, clinical reports</div>
              <button className="btn btn-primary btn-sm btn-full" style={{ marginTop: 8 }}>
                Sign in as Doctor
              </button>
            </div>

            <div
              className={`role-select-box ${selectedRole === 'patient' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('patient'); handleQuickLogin('patient'); }}
            >
              <div className="role-icon">👤</div>
              <div className="role-name">Patient Portal</div>
              <div className="role-desc">View personal scans, AI results & PDF reports</div>
              <button className="btn btn-green btn-sm btn-full" style={{ marginTop: 8 }}>
                Sign in as Patient
              </button>
            </div>

            <div
              className={`role-select-box ${selectedRole === 'admin' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('admin'); handleQuickLogin('admin'); }}
            >
              <div className="role-icon">🛡️</div>
              <div className="role-name">Admin Portal</div>
              <div className="role-desc">System health, AI telemetry, user management</div>
              <button className="btn btn-cyan btn-sm btn-full" style={{ marginTop: 8 }}>
                Sign in as Admin
              </button>
            </div>
          </div>
        </div>

        <div className="login-divider">
          <span>OR SIGN IN WITH CREDENTIALS</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-control"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
            >
              <option value="doctor">Doctor / Clinician</option>
              <option value="patient">Patient</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Email or Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. doctor@easyxray.health"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 10 }}>
            Sign In to {selectedRole.toUpperCase()} Dashboard →
          </button>
        </form>

        <div className="login-footer">
          <span>ResNet-50 Deep Learning · Grad-CAM Visual Explainability · DRF 5.x</span>
        </div>
      </div>
    </div>
  )
}
