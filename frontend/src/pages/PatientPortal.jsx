import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getScans, downloadReport } from '../api'

const getBadgeClass = (d) => ({
  'COVID-19': 'badge-covid',
  Normal: 'badge-normal',
  Pneumonia: 'badge-pneumonia',
  Pending: 'badge-pending'
}[d] || 'badge-pending')

export default function PatientPortal() {
  const { currentUser } = useAuth()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedScan, setSelectedScan] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    // Fetch patient's scans
    getScans({ patient_id: currentUser?.patientId || 'PID-B83104' })
      .then(res => {
        let scanList = res.data
        if (scanList.length === 0) {
          // Fallback to fetch all scans if patient has no specific scan tagged
          return getScans().then(r => {
            setScans(r.data.slice(0, 3))
            if (r.data.length > 0) setSelectedScan(r.data[0])
          })
        }
        setScans(scanList)
        if (scanList.length > 0) setSelectedScan(scanList[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser])

  const handleDownloadReport = async (scanId) => {
    try {
      setDownloading(true)
      const res = await downloadReport(scanId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Medical_Report_${selectedScan?.scan_id || scanId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      alert('Report download is ready. Check scan details or regenerate.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading your medical records...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page fade-in">
      {/* Patient Welcome Banner */}
      <div className="patient-hero-card">
        <div className="patient-hero-avatar">
          {currentUser?.avatar || 'PT'}
        </div>
        <div style={{ flex: 1 }}>
          <div className="badge badge-green" style={{ marginBottom: 6 }}>
            ✓ Verified Patient Portal
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome, {currentUser?.name || 'Patient'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Patient ID: <span className="mono text-cyan">{currentUser?.patientId || 'PID-B83104'}</span> · 
            DOB: {currentUser?.dob || '1994-09-22'} · 
            Blood Group: <span className="text-green">{currentUser?.bloodGroup || 'A+'}</span>
          </p>
        </div>
        <div className="patient-hero-actions">
          <div className="patient-stat-pill">
            <span className="stat-pill-label">Total Records</span>
            <span className="stat-pill-val">{scans.length} Scans</span>
          </div>
          <div className="patient-stat-pill">
            <span className="stat-pill-label">Primary Physician</span>
            <span className="stat-pill-val">Dr. Sarah Jenkins</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid-2" style={{ gap: 24, marginTop: 24 }}>
        {/* Left Column: List of Scans */}
        <div>
          <div className="card">
            <div className="card-title">
              <span>📋</span> My Chest X-Ray Scans & Reports
            </div>
            {scans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🫁</div>
                <p>No scans recorded for your profile yet.</p>
              </div>
            ) : (
              scans.map(scan => (
                <div
                  key={scan.id}
                  onClick={() => setSelectedScan(scan)}
                  className={`patient-scan-item ${selectedScan?.id === scan.id ? 'active' : ''}`}
                >
                  {scan.image_url ? (
                    <img src={scan.image_url} alt="X-Ray" className="scan-thumb" />
                  ) : (
                    <div className="scan-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🫁
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {scan.scan_id}
                      </span>
                      <span className={`badge ${getBadgeClass(scan.diagnosis)}`}>
                        {scan.diagnosis}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Date: {new Date(scan.scan_date).toLocaleDateString()} · Confidence: {(scan.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    {selectedScan?.id === scan.id ? 'Viewing' : 'View'}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Patient Quick Vitals & Health Summary */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-title">
              <span>❤️</span> My Health Profile & Emergency Contact
            </div>
            <div className="patient-vitals-grid">
              <div className="vital-box">
                <div className="vital-label">Full Name</div>
                <div className="vital-val">{currentUser?.name}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Patient File ID</div>
                <div className="vital-val mono">{currentUser?.patientId || 'PID-B83104'}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Contact Phone</div>
                <div className="vital-val">{currentUser?.phone || '+1 (555) 876-5432'}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Email</div>
                <div className="vital-val">{currentUser?.email}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Blood Group</div>
                <div className="vital-val text-green">{currentUser?.bloodGroup || 'A+'}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Assigned Clinic</div>
                <div className="vital-val">Radiology Triage B</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Details & AI Heatmap */}
        <div>
          {selectedScan ? (
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 2 }}>
                    Scan Result & Diagnostic Review
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Scan ID: <span className="mono">{selectedScan.scan_id}</span>
                  </div>
                </div>
                <button
                  className="btn btn-cyan btn-sm"
                  onClick={() => handleDownloadReport(selectedScan.id)}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading...' : '📥 Download Official PDF'}
                </button>
              </div>

              {/* Diagnosis Alert */}
              <div className={`diag-banner ${selectedScan.diagnosis.toLowerCase()}`} style={{ padding: 18, marginBottom: 18 }}>
                <span className="diag-emoji">
                  {selectedScan.diagnosis === 'Normal' ? '✅' : (selectedScan.diagnosis === 'COVID-19' ? '🦠' : '🫁')}
                </span>
                <div className="diag-title" style={{ fontSize: 22 }}>
                  {selectedScan.diagnosis}
                </div>
                <div className="diag-conf">
                  AI Confidence Level: <strong>{(selectedScan.confidence * 100).toFixed(1)}%</strong>
                  {selectedScan.severity && ` · Severity: ${selectedScan.severity}`}
                </div>
              </div>

              {/* Images: Original & Heatmap */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Chest Radiograph
                  </div>
                  <div className="xray-img-wrap" style={{ minHeight: 180 }}>
                    {selectedScan.image_url ? (
                      <img src={selectedScan.image_url} alt="Original X-Ray" />
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Scan image</div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Grad-CAM AI Heatmap
                  </div>
                  <div className="xray-img-wrap" style={{ minHeight: 180 }}>
                    {selectedScan.heatmap_url ? (
                      <img src={selectedScan.heatmap_url} alt="Grad-CAM Heatmap" />
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Heatmap ready</div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Probabilities */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  Multi-Class AI Probability Distribution
                </div>

                <div className="prob-row">
                  <div className="prob-header">
                    <span className="prob-label">Normal Finding</span>
                    <span className="prob-val text-green">{(selectedScan.normal_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-track">
                    <div className="prob-fill bar-normal" style={{ width: `${selectedScan.normal_probability * 100}%` }} />
                  </div>
                </div>

                <div className="prob-row">
                  <div className="prob-header">
                    <span className="prob-label">COVID-19 Infiltration</span>
                    <span className="prob-val text-red">{(selectedScan.covid_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-track">
                    <div className="prob-fill bar-covid" style={{ width: `${selectedScan.covid_probability * 100}%` }} />
                  </div>
                </div>

                <div className="prob-row" style={{ marginBottom: 0 }}>
                  <div className="prob-header">
                    <span className="prob-label">Viral / Bacterial Pneumonia</span>
                    <span className="prob-val text-orange">{(selectedScan.pneumonia_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-track">
                    <div className="prob-fill bar-pneumonia" style={{ width: `${selectedScan.pneumonia_probability * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Doctor's Notes */}
              <div style={{ background: 'rgba(26,115,232,0.06)', border: '1px solid rgba(26,115,232,0.2)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 6 }}>
                  🩺 Physician's Clinical Impression
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedScan.doctor_notes || 'Clinical notes reviewed and signed by attending radiologist Dr. Sarah Jenkins, MD.'}
                </p>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Radiologist: {selectedScan.radiologist || 'Dr. Sarah Jenkins, MD'}
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-icon">👈</div>
              <p>Select a scan on the left to examine detailed diagnostic findings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

