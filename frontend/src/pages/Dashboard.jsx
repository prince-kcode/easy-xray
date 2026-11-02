import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = { 'COVID-19': '#f44336', Normal: '#00e676', Pneumonia: '#ff9100' }
const getBadgeClass = (d) => ({ 'COVID-19': 'badge-covid', Normal: 'badge-normal', Pneumonia: 'badge-pneumonia', Pending: 'badge-pending' }[d] || 'badge-pending')

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let current = 0
    const step = Math.max(1, Math.ceil(value / 50))
    const timer = setInterval(() => {
      current = Math.min(current + step, value)
      setDisplay(current)
      if (current >= value) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}</>
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading dashboard...</div>
      </div>
    </div>
  )

  const chartData = [
    { name: 'COVID-19', value: data?.covid_cases || 0 },
    { name: 'Normal', value: data?.normal_cases || 0 },
    { name: 'Pneumonia', value: data?.pneumonia_cases || 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Clinical Dashboard</h1>
        <p className="page-sub">Real-time AI-powered chest X-ray diagnostics overview</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {[
          { label: 'Total Patients', value: data?.total_patients || 0, icon: '👥', cls: 'blue' },
          { label: 'Total Scans', value: data?.total_scans || 0, icon: '🔬', cls: 'cyan' },
          { label: 'COVID-19 Cases', value: data?.covid_cases || 0, icon: '🦠', cls: 'red' },
          { label: 'Pneumonia Cases', value: data?.pneumonia_cases || 0, icon: '🫁', cls: 'orange' },
          { label: 'Normal Scans', value: data?.normal_cases || 0, icon: '✅', cls: 'green' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value"><AnimatedNumber value={s.value} /></div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 22, marginBottom: 22 }}>
        {/* Recent Scans */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>🕐 Recent Scans</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/scans')}>View All</button>
          </div>
          {data?.recent_scans?.length > 0 ? data.recent_scans.map(scan => (
            <div key={scan.id}
              onClick={() => navigate(`/scan/${scan.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(26,115,232,0.07)', cursor: 'pointer', transition: 'padding-left 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.paddingLeft = '6px'}
              onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
            >
              {scan.image_url
                ? <img src={scan.image_url} alt="xray" className="scan-thumb" />
                : <div className="scan-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🫁</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {scan.patient_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {scan.scan_id} · {new Date(scan.scan_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span className={`badge ${getBadgeClass(scan.diagnosis)}`}>{scan.diagnosis}</span>
            </div>
          )) : (
            <div className="empty-state">
              <div className="empty-icon">🔬</div>
              <p>No scans yet. <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => navigate('/scan/upload')}>Analyze an X-ray</span></p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="card">
          <div className="card-title">📊 Diagnosis Distribution</div>
          {data?.total_scans > 0 ? (
            <>
              <div style={{ height: 200, marginBottom: 18 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'COVID-19', value: data.covid_cases, color: '#f44336' },
                  { label: 'Normal', value: data.normal_cases, color: '#00e676' },
                  { label: 'Pneumonia', value: data.pneumonia_cases, color: '#ff9100' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 3, background: item.color }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No scan data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions + Recent Patients */}
      <div className="grid-2" style={{ gap: 22 }}>
        <div className="card">
          <div className="card-title">👤 Recent Patients</div>
          {data?.recent_patients?.length > 0 ? data.recent_patients.map(p => (
            <div key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid rgba(26,115,232,0.07)', cursor: 'pointer' }}
            >
              <div className="patient-avatar" style={{ width: 36, height: 36, fontSize: 14, borderRadius: 9 }}>
                {p.first_name?.[0]}{p.last_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.patient_id} · Age {p.age}</div>
              </div>
              <span className="badge badge-blue">{p.scan_count} scans</span>
            </div>
          )) : (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p>No patients yet. <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => navigate('/patients/add')}>Add one</span></p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">⚡ Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <button className="btn btn-cyan btn-lg btn-full" onClick={() => navigate('/scan/upload')}>
              🔬 Analyze New X-Ray
            </button>
            <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/patients/add')}>
              👤 Register New Patient
            </button>
            <button className="btn btn-outline btn-lg btn-full" onClick={() => navigate('/scans')}>
              📋 View All Records
            </button>
          </div>
          <div style={{ marginTop: 22, padding: 16, background: 'rgba(26,115,232,0.06)', borderRadius: 11, border: '1px solid rgba(26,115,232,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 10, letterSpacing: '0.5px' }}>🤖 AI MODEL INFO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Architecture', 'ResNet-50'], ['Explainability', 'Grad-CAM'], ['Classes', '3 (COVID/Normal/PNM)'], ['Report', 'PDF Export']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
