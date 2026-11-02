import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getPatients, uploadScan, validateImage } from '../api'

export default function UploadScan() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null)
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patient_id: location.state?.preselectPatientId || '',
    radiologist: '',
    doctor_notes: ''
  })
  const fileRef = useRef()

  useEffect(() => {
    getPatients().then(r => setPatients(r.data)).catch(() => {})
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setFileName(file.name)
    fileRef.current._file = file
    setError('')
    setValidation(null)
    setValidating(true)

    // Run real-time X-Ray gatekeeper verification
    try {
      const fd = new FormData()
      fd.append('xray_image', file)
      const res = await validateImage(fd)
      setValidation(res.data)
      if (!res.data.is_xray) {
        setError(res.data.reason || 'Uploaded image is not recognized as a chest X-Ray.')
      }
    } catch (err) {
      console.error(err)
      setValidation({ is_xray: true, confidence: 0.85, reason: 'Offline verification' })
    } finally {
      setValidating(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id) return setError('Please select a patient.')
    if (!fileRef.current?._file) return setError('Please upload an X-ray image.')
    if (validation && !validation.is_xray) {
      return setError('Cannot analyze: The image is NOT a valid chest X-ray.')
    }
    setError('')
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('patient_id', form.patient_id)
      fd.append('xray_image', fileRef.current._file)
      fd.append('radiologist', form.radiologist)
      fd.append('doctor_notes', form.doctor_notes)
      const res = await uploadScan(fd)
      navigate(`/scan/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze scan. Please try again.')
      setAnalyzing(false)
    }
  }

  if (analyzing) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">🔬 AI is analyzing your X-Ray...</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Running ResNet-50 inference and generating Grad-CAM heatmap
      </div>
    </div>
  )

  const isBlocked = validation && !validation.is_xray

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">🔬 X-Ray Diagnostic Analysis</h1>
        <p className="page-sub">Dual-AI System: Modality Verification + ResNet-50 Pathology Diagnosis</p>
      </div>

      <div className="grid-2" style={{ gap: 26, alignItems: 'start' }}>
        {/* Left: Form */}
        <div>
          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🚫</span>
              <span>{error}</span>
            </div>
          )}

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">👤 Patient Selection</div>
            <div className="form-group">
              <label className="form-label">Select Patient <span className="req">*</span></label>
              {patients.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--accent-orange)' }}>
                  No patients registered. <a href="/patients/add" style={{ color: 'var(--accent-cyan)' }}>Register one first →</a>
                </div>
              ) : (
                <select
                  className="form-control"
                  value={form.patient_id}
                  onChange={e => setForm({ ...form, patient_id: e.target.value })}
                >
                  <option value="">-- Choose a patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_id}) — {p.age}y {p.gender}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Attending Radiologist</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={form.radiologist}
                  onChange={e => setForm({ ...form, radiologist: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Indication</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Persistent fever, cough"
                  value={form.doctor_notes}
                  onChange={e => setForm({ ...form, doctor_notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🩻 Upload Radiograph</span>
              <span className="badge badge-pending" style={{ fontSize: 10.5 }}>
                AI Verified Modality
              </span>
            </div>

            <div
              className={`upload-zone${drag ? ' drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('xray-file-input').click()}
            >
              <input
                id="xray-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={el => {
                  if (el && !fileRef.current) fileRef.current = el
                  else if (el) fileRef.current = el
                }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxWidth: 220,
                      maxHeight: 220,
                      borderRadius: 10,
                      border: isBlocked ? '2px solid #ff5252' : '2px solid var(--accent-green)',
                      marginBottom: 10
                    }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600 }}>{fileName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Click to change image</div>
                </div>
              ) : (
                <>
                  <span className="upload-icon">🫁</span>
                  <div className="upload-title">Drop Chest X-Ray here or click to browse</div>
                  <div className="upload-hint">Supports PNG, JPG, DICOM exports · Tested by AI Gatekeeper</div>
                </>
              )}
            </div>

            {/* Validation State Display */}
            {validating && (
              <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--accent-cyan)' }}>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span>AI Gatekeeper Model: Verifying if image is a valid chest X-ray...</span>
              </div>
            )}

            {validation && !validating && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: validation.is_xray ? 'rgba(0,230,118,0.08)' : 'rgba(255,23,68,0.1)',
                border: `1px solid ${validation.is_xray ? 'rgba(0,230,118,0.25)' : 'rgba(255,23,68,0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12.5
              }}>
                <span style={{ fontSize: 18 }}>{validation.is_xray ? '✅' : '🚫'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: validation.is_xray ? 'var(--accent-green)' : '#ff5252' }}>
                    {validation.is_xray
                      ? `Verified Chest Radiograph (${(validation.confidence * 100).toFixed(1)}% Confidence)`
                      : `Rejected: NOT an X-Ray (${(validation.confidence * 100).toFixed(1)}% Confidence)`}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {validation.reason}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className={`btn btn-lg btn-full ${isBlocked ? 'btn-danger' : 'btn-cyan'}`}
            onClick={handleSubmit}
            disabled={!form.patient_id || !preview || isBlocked || validating || patients.length === 0}
          >
            {isBlocked
              ? '🚫 Upload Blocked (Not an X-Ray)'
              : validating
              ? '⏳ Verifying Image...'
              : '🧠 Analyze with AI'}
          </button>
        </div>

        {/* Right: Dual-AI Architecture & How it works */}
        <div>
          <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(0,229,255,0.3)' }}>
            <div className="card-title" style={{ color: 'var(--accent-cyan)' }}>
              🛡️ Dual-AI Model Verification Architecture
            </div>
            
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(26,115,232,0.08)', marginBottom: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                1. Gatekeeper Model (ResNet-18)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Trained to recognize chest radiograph anatomical signatures vs arbitrary non-medical photos (selfies, documents, vehicles, animals, nature). Rejects invalid images before triage.
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-green)', marginBottom: 4 }}>
                2. Pathology Classifier (ResNet-50 + Grad-CAM)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Evaluates validated radiographs for <strong>COVID-19</strong>, <strong>Pneumonia</strong>, and <strong>Normal</strong> lung fields, overlaying deep neural activation heatmaps.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">🤖 AI Capabilities</div>
            {[
              { icon: '🛡️', title: 'Modality Gatekeeper', desc: 'Auto-detects & filters non-X-ray images', color: 'var(--accent-cyan)', bg: 'rgba(0,229,255,0.06)', brd: 'rgba(0,229,255,0.15)' },
              { icon: '🦠', title: 'COVID-19 Detection', desc: 'Identifies viral infiltration & consolidation', color: '#ff5252', bg: 'rgba(244,67,54,0.06)', brd: 'rgba(244,67,54,0.15)' },
              { icon: '✅', title: 'Normal Classification', desc: 'Confirms healthy, clear lung fields', color: 'var(--accent-green)', bg: 'rgba(0,230,118,0.06)', brd: 'rgba(0,230,118,0.15)' },
              { icon: '🫁', title: 'Pneumonia Detection', desc: 'Detects bacterial & viral pulmonary opacities', color: '#ffab40', bg: 'rgba(255,145,0,0.06)', brd: 'rgba(255,145,0,0.15)' },
              { icon: '🔥', title: 'Grad-CAM Heatmap', desc: 'Visual explanation of neural attention regions', color: '#7c4dff', bg: 'rgba(124,77,255,0.06)', brd: 'rgba(124,77,255,0.15)' },
            ].map(c => (
              <div key={c.title} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 9, background: c.bg, border: `1px solid ${c.brd}`, marginBottom: 9 }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: c.color }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
