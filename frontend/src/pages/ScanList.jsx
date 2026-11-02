import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getScans, downloadReport } from '../api'

const getBadgeClass = (d) => ({
  'COVID-19': 'badge-covid',
  Normal: 'badge-normal',
  Pneumonia: 'badge-pneumonia',
}[d] || 'badge-pending')

export default function ScanList() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDiag, setFilterDiag] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const navigate = useNavigate()

  const loadScans = () => {
    setLoading(true)
    const params = {}
    if (search) params.q = search
    if (filterDiag) params.diagnosis = filterDiag

    getScans(params)
      .then(r => setScans(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadScans()
    }, 250)
    return () => clearTimeout(timer)
  }, [search, filterDiag])

  const handleDownload = async (scanId, e) => {
    e.stopPropagation()
    setDownloadingId(scanId)
    try {
      const res = await downloadReport(scanId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `EasyXRay_Report_${scanId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download PDF report.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Radiology Scan Records</h1>
          <p className="page-sub">Historical chest X-ray analyses, AI diagnoses, and clinical findings</p>
        </div>
        <Link to="/scan/upload" className="btn btn-cyan">
          ＋ Analyze New X-Ray
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="card mb-20" style={{ padding: '14px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 240 }}>
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by scan ID or patient name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'All Diagnoses', val: '' },
            { label: '🦠 COVID-19', val: 'COVID-19' },
            { label: '🫁 Normal', val: 'Normal' },
            { label: '⚠️ Pneumonia', val: 'Pneumonia' },
          ].map(f => (
            <button
              key={f.val}
              className={`btn btn-sm ${filterDiag === f.val ? 'btn-cyan' : 'btn-outline'}`}
              onClick={() => setFilterDiag(f.val)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" />
          <div style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>Loading scans...</div>
        </div>
      ) : scans.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🩻</div>
          <h3>No Scans Found</h3>
          <p style={{ marginTop: 6, marginBottom: 18 }}>
            {search || filterDiag ? 'No records match your filter criteria.' : 'No X-ray scans have been recorded yet.'}
          </p>
          <Link to="/scan/upload" className="btn btn-primary">
            Analyze First Scan
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Scan ID</th>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Radiologist</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id} onClick={() => navigate(`/scan/${s.id}`)}>
                    <td>
                      <img
                        src={s.heatmap_url || s.image_url || '/placeholder.png'}
                        alt="Scan preview"
                        className="scan-thumb"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </td>
                    <td>
                      <span className="mono badge badge-blue">{s.scan_id}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.patient_name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.patient_id_str}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(s.diagnosis)}`}>
                        {s.diagnosis === 'COVID-19' ? '🦠' : s.diagnosis === 'Normal' ? '✅' : '⚠️'} {s.diagnosis}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {(s.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: s.severity === 'Severe' ? '#ff5252' : s.severity === 'Moderate' ? '#ffab40' : '#00e676'
                      }}>
                        {s.severity || 'Normal'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {s.radiologist || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(s.scan_date).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          className="btn btn-cyan btn-sm"
                          onClick={() => navigate(`/scan/${s.id}`)}
                          title="View AI Analysis"
                        >
                          View AI
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={e => handleDownload(s.id, e)}
                          disabled={downloadingId === s.id}
                          title="Download PDF Diagnostic Report"
                        >
                          {downloadingId === s.id ? '...' : '📄 PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
