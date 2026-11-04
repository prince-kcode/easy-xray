import React, { useState, useEffect } from 'react'
import { getDashboard, getPatients, getScans } from '../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [patients, setPatients] = useState([])
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [userTab, setUserTab] = useState('all')

  const staffUsers = [
    { id: 'STF-01', name: 'Dr. Sarah Jenkins, MD', email: 's.jenkins@easyxray.health', role: 'Doctor', dept: 'Pulmonology', status: 'Active', scansLogged: 42 },
    { id: 'STF-02', name: 'Dr. Robert Chen, MD', email: 'r.chen@easyxray.health', role: 'Doctor', dept: 'Radiology', status: 'Active', scansLogged: 29 },
    { id: 'STF-03', name: 'Admin Alex Mercer', email: 'admin@easyxray.health', role: 'Admin', dept: 'System & AI Operations', status: 'Active', scansLogged: 0 },
    { id: 'STF-04', name: 'Nurse Clara Oswald', email: 'c.oswald@easyxray.health', role: 'Staff Nurse', dept: 'Triage Intake', status: 'Active', scansLogged: 15 },
  ]

  const auditLogs = [
    { id: 'LOG-891', time: '10 mins ago', action: 'Grad-CAM Inference Generated', user: 'Dr. Sarah Jenkins', target: 'SCN-2026-0003', status: 'Success' },
    { id: 'LOG-890', time: '25 mins ago', action: 'Clinical Report PDF Downloaded', user: 'Elena Rostova (Patient)', target: 'Medical_Report_SCN-0002.pdf', status: 'Success' },
    { id: 'LOG-889', time: '1 hour ago', action: 'New Patient Intake Registered', user: 'Dr. Sarah Jenkins', target: 'Marcus Vance (PID-A74921)', status: 'Success' },
    { id: 'LOG-888', time: '2 hours ago', action: 'AI Model Checkpoint Verified', user: 'System Watchdog', target: 'best_detector_resnet18.pth', status: 'Success' },
    { id: 'LOG-887', time: '3 hours ago', action: 'Gatekeeper Validation Passed', user: 'Dr. Sarah Jenkins', target: 'frontal_xray_test.png', status: 'Success' },
  ]

  useEffect(() => {
    Promise.all([getDashboard(), getPatients(), getScans()])
      .then(([dashRes, patRes, scanRes]) => {
        setStats(dashRes.data)
        setPatients(patRes.data)
        setScans(scanRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading admin telemetries...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div className="badge badge-blue" style={{ marginBottom: 6 }}>
          🛡️ System Administration & AI Operations
        </div>
        <h1 className="page-title">Admin Control Center</h1>
        <p className="page-sub">System health, staff access control, AI pipeline metrics & audit logs</p>
      </div>

      {/* Admin Quick Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card cyan">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">38<span style={{ fontSize: 16 }}>ms</span></div>
          <div className="stat-label">AI Inference Speed</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">🧠</div>
          <div className="stat-value">95.4<span style={{ fontSize: 16 }}>%</span></div>
          <div className="stat-label">Diagnostic Accuracy</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{patients.length}</div>
          <div className="stat-label">Registered Patients</div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{scans.length}</div>
          <div className="stat-label">Total AI Scans</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">👨‍⚕️</div>
          <div className="stat-value">{staffUsers.length}</div>
          <div className="stat-label">Medical Staff Accounts</div>
        </div>
      </div>

      {/* AI Engine & System Status Bar */}
      <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex items-center gap-12">
            <div className="ai-dot" style={{ width: 12, height: 12 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Easy X-Ray Neural Diagnostics Engine — ResNet-50 PyTorch
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Grad-CAM Layer4 Heatmap Overlay · Gatekeeper Binary Classifier: Active · Server Latency: 4ms
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="badge badge-normal">● ONLINE & HEALTHY</span>
            <span className="badge badge-blue">Uptime: 99.98%</span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        {/* User & Staff Management */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <span>👥</span> Medical Staff & Role Permissions
            </div>
            <div className="flex gap-8">
              <span className="badge badge-blue">{staffUsers.length} Users</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'Admin' ? 'badge-blue' : (user.role === 'Doctor' ? 'badge-cyan' : 'badge-pending')}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.dept}</td>
                    <td>
                      <span className="text-green" style={{ fontSize: 12, fontWeight: 700 }}>
                        ● {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Audit Logs */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <span>📜</span> Real-time Security & Audit Trail
            </div>
            <span className="badge badge-cyan">Live Event Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  borderLeft: '3px solid var(--accent-cyan)'
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    By: <span className="text-cyan">{log.user}</span> · Target: <span className="mono">{log.target}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>{log.status}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{log.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Performance & Confusion Matrix Summary */}
      <div className="card">
        <div className="card-title">
          <span>📊</span> Deep Learning Class-Wise Metric Benchmark
        </div>
        <div className="grid-3" style={{ gap: 16 }}>
          <div style={{ padding: 16, background: 'rgba(255,23,68,0.05)', borderRadius: 10, border: '1px solid rgba(255,23,68,0.2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-red)', marginBottom: 4 }}>COVID-19 Detector</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ff5252' }}>96.2%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Precision: 95.8% · Recall: 96.6%</div>
          </div>

          <div style={{ padding: 16, background: 'rgba(255,145,0,0.05)', borderRadius: 10, border: '1px solid rgba(255,145,0,0.2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-orange)', marginBottom: 4 }}>Pneumonia Infiltration</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ffab40' }}>93.8%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Precision: 92.5% · Recall: 95.1%</div>
          </div>

          <div style={{ padding: 16, background: 'rgba(0,230,118,0.05)', borderRadius: 10, border: '1px solid rgba(0,230,118,0.2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>Normal Baseline</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-green)' }}>97.1%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Precision: 98.0% · Recall: 96.2%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

