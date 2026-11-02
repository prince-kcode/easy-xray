import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getScan, downloadReport } from '../api'

export default function ScanResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [activeView, setActiveView] = useState('both') // 'both', 'original', 'heatmap'

  useEffect(() => {
    setLoading(true)
    getScan(id)
      .then(r => setScan(r.data))
      .catch(err => {
        setError('Failed to load scan diagnostic data.')
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDownloadPDF = async () => {
    if (!scan) return
    setDownloading(true)
    try {
      const res = await downloadReport(scan.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `EasyXRay_Diagnostic_Report_${scan.scan_id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate or download diagnostic PDF report.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '90px 0' }}>
        <div className="spinner" />
        <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>
          Loading AI Diagnostic Analysis...
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="page fade-in">
        <div className="card empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Scan Not Found</h3>
          <p>{error || 'The requested scan record does not exist.'}</p>
          <Link to="/scans" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to Scans
          </Link>
        </div>
      </div>
    )
  }

  const diagnosisClass = scan.diagnosis === 'COVID-19' ? 'covid' : scan.diagnosis === 'Normal' ? 'normal' : 'pneumonia'
  const diagnosisEmoji = scan.diagnosis === 'COVID-19' ? '🦠' : scan.diagnosis === 'Normal' ? '🫁' : '⚠️'

  const covidPct = ((scan.covid_probability || 0) * 100).toFixed(1)
  const normalPct = ((scan.normal_probability || 0) * 100).toFixed(1)
  const pneuPct = ((scan.pneumonia_probability || 0) * 100).toFixed(1)
  const confPct = ((scan.confidence || 0) * 100).toFixed(1)

  return (
    <div className="page fade-in">
      {/* Top Bar Navigation */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">AI Diagnostic Analysis</h1>
            <span className="mono badge badge-blue">{scan.scan_id}</span>
          </div>
          <p className="page-sub">
            Patient: <strong style={{ color: 'var(--text-primary)' }}>{scan.patient_name}</strong> ({scan.patient_id_str}) · Scanned on {new Date(scan.scan_date).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? '📄 Generating Report...' : '📥 Download Medical PDF'}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/patients/${scan.patient}`)}
          >
            👤 Patient Chart
          </button>
          <button
            className="btn btn-cyan"
            onClick={() => navigate('/scan/upload')}
          >
            ＋ New Scan
          </button>
        </div>
      </div>

      {/* Main Diagnosis Banner */}
      <div className={`diag-banner ${diagnosisClass}`}>
        <span className="diag-emoji">{diagnosisEmoji}</span>
        <div className="diag-title">
          {scan.diagnosis === 'COVID-19' && 'COVID-19 Infection Detected'}
          {scan.diagnosis === 'Normal' && 'Normal — No Pathological Opacities Detected'}
          {scan.diagnosis === 'Pneumonia' && 'Pneumonia (Non-COVID) Infiltration Detected'}
        </div>
        <div className="diag-conf">
          AI Confidence: <strong style={{ color: 'var(--text-primary)' }}>{confPct}%</strong> &nbsp;·&nbsp;
          Severity Rating: <strong style={{
            color: scan.severity === 'Severe' ? '#ff5252' : scan.severity === 'Moderate' ? '#ffab40' : '#00e676'
          }}>{scan.severity || 'Normal'}</strong>
        </div>
      </div>

      {/* View Switcher for Image Comparison */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="card-title" style={{ margin: 0 }}>
          🩻 Radiological Imaging & Deep Learning Visualization
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            className={`btn btn-sm ${activeView === 'both' ? 'btn-cyan' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('both')}
          >
            Split View
          </button>
          <button
            className={`btn btn-sm ${activeView === 'original' ? 'btn-cyan' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('original')}
          >
            Original
          </button>
          <button
            className={`btn btn-sm ${activeView === 'heatmap' ? 'btn-cyan' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('heatmap')}
          >
            Grad-CAM Heatmap
          </button>
        </div>
      </div>

      {/* Image Display Grid */}
      <div className={`grid-${activeView === 'both' ? '2' : '1'} mb-20`}>
        {(activeView === 'both' || activeView === 'original') && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>ORIGINAL CHEST RADIOGRAPH</span>
              <span className="text-muted">PA View</span>
            </div>
            <div className="xray-img-wrap">
              <img
                src={scan.image_url || '/placeholder.png'}
                alt="Original Chest X-Ray"
                style={{ maxHeight: 420, objectFit: 'contain', margin: '0 auto' }}
              />
              <div className="xray-lbl">Original Radiograph</div>
            </div>
          </div>
        )}

        {(activeView === 'both' || activeView === 'heatmap') && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>GRAD-CAM PATHOLOGY HEATMAP</span>
              <span className="badge badge-pending">ResNet-50 Activation</span>
            </div>
            <div className="xray-img-wrap">
              <img
                src={scan.heatmap_url || scan.image_url || '/placeholder.png'}
                alt="Grad-CAM Heatmap"
                style={{ maxHeight: 420, objectFit: 'contain', margin: '0 auto' }}
              />
              <div className="xray-lbl" style={{ color: '#ff9100', borderColor: 'rgba(255,145,0,0.3)' }}>
                Attention Regions
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Probabilities & Clinical Notes Grid */}
      <div className="grid-2 mb-20">
        {/* Class Probabilities */}
        <div className="card">
          <div className="card-title">📊 Multi-Class Probability Distribution</div>
          
          <div className="prob-row">
            <div className="prob-header">
              <span className="prob-label">🦠 COVID-19 Viral Pneumonia</span>
              <span className="prob-val" style={{ color: '#ff5252' }}>{covidPct}%</span>
            </div>
            <div className="prob-track">
              <div className="prob-fill bar-covid" style={{ width: `${covidPct}%` }} />
            </div>
          </div>

          <div className="prob-row">
            <div className="prob-header">
              <span className="prob-label">🫁 Normal (Clear Lung Fields)</span>
              <span className="prob-val" style={{ color: '#00e676' }}>{normalPct}%</span>
            </div>
            <div className="prob-track">
              <div className="prob-fill bar-normal" style={{ width: `${normalPct}%` }} />
            </div>
          </div>

          <div className="prob-row">
            <div className="prob-header">
              <span className="prob-label">⚠️ Bacterial / Other Pneumonia</span>
              <span className="prob-val" style={{ color: '#ff9100' }}>{pneuPct}%</span>
            </div>
            <div className="prob-track">
              <div className="prob-fill bar-pneumonia" style={{ width: `${pneuPct}%` }} />
            </div>
          </div>

          <div style={{ marginTop: 22, padding: 12, borderRadius: 10, background: 'rgba(26,115,232,0.06)', border: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-secondary)' }}>
            💡 <strong>Grad-CAM Explanation:</strong> Red & yellow highlights identify localized opacities and pulmonary consolidation identified by the convolutional neural network as key predictive evidence.
          </div>
        </div>

        {/* Clinical Documentation */}
        <div className="card">
          <div className="card-title">📝 Clinical Metadata & Notes</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Attending Radiologist
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                {scan.radiologist ? `Dr. ${scan.radiologist}` : 'Automated Diagnostic Pipeline'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Report Status
              </div>
              <div style={{ marginTop: 3 }}>
                <span className={`badge ${scan.report_generated ? 'badge-normal' : 'badge-pending'}`}>
                  {scan.report_generated ? '✓ Report Generated' : '⏳ Pending Export'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Radiologist / Doctor Observations
            </div>
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              color: scan.doctor_notes ? 'var(--text-primary)' : 'var(--text-muted)',
              minHeight: 80,
              fontStyle: scan.doctor_notes ? 'normal' : 'italic'
            }}>
              {scan.doctor_notes || 'No doctor notes documented for this scan.'}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary btn-full"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? 'Generating PDF...' : '📄 Download Official Medical Report (PDF)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
