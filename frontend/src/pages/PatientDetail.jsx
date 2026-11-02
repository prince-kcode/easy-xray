import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPatient, updatePatient, deletePatient, downloadReport } from '../api'

const getBadgeClass = (d) => ({
  'COVID-19': 'badge-covid',
  Normal: 'badge-normal',
  Pneumonia: 'badge-pneumonia',
}[d] || 'badge-pending')

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const loadData = () => {
    setLoading(true)
    getPatient(id)
      .then(r => {
        setData(r.data)
        setEditForm(r.data.patient)
      })
      .catch(err => {
        setError('Failed to load patient records.')
        console.error(err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePatient(id, editForm)
      setEditing(false)
      loadData()
    } catch (err) {
      alert('Failed to update patient details.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete patient ${data.patient.full_name}? This will remove all their scans.`)) {
      try {
        await deletePatient(id)
        navigate('/patients')
      } catch (err) {
        alert('Failed to delete patient.')
      }
    }
  }

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

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" />
        <div style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>Loading medical chart...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page fade-in">
        <div className="card empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Patient Not Found</h3>
          <p>{error || 'The requested patient profile does not exist.'}</p>
          <Link to="/patients" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to Directory
          </Link>
        </div>
      </div>
    )
  }

  const { patient, scans } = data

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{patient.full_name}</h1>
            <span className="mono badge badge-blue">{patient.patient_id}</span>
          </div>
          <p className="page-sub">Registered on {new Date(patient.created_at).toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-cyan"
            onClick={() => navigate('/scan/upload', { state: { preselectPatientId: patient.id } })}
          >
            🔬 Analyze New X-Ray
          </button>
          <button className="btn btn-outline" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Cancel Edit' : '✏️ Edit Profile'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Delete patient">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Edit Form Modal/Card */}
      {editing && (
        <div className="card mb-20 fade-in" style={{ borderColor: 'var(--accent-cyan)' }}>
          <div className="card-title">✏️ Update Patient Information</div>
          <form onSubmit={handleUpdate}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.first_name || ''}
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.last_name || ''}
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-control"
                  value={editForm.date_of_birth || ''}
                  onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-control"
                  value={editForm.gender || 'Male'}
                  onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select
                  className="form-control"
                  value={editForm.blood_group || 'O+'}
                  onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={editForm.phone || ''}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email || ''}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                value={editForm.address || ''}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-cyan" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Demographic Card */}
      <div className="card mb-20">
        <div className="card-title">👤 Patient Demographics & Contact</div>
        <div className="grid-3" style={{ gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Age & Gender
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
              {patient.age ?? '—'} years old · {patient.gender || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              DOB: {patient.date_of_birth || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Blood Group
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="badge badge-pending" style={{ fontSize: 13, padding: '4px 12px' }}>
                🩸 {patient.blood_group || 'Unknown'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Contact Details
            </div>
            <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-primary)' }}>
              📞 {patient.phone || 'No phone provided'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              ✉️ {patient.email || 'No email provided'}
            </div>
          </div>
        </div>
        {patient.address && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
            📍 <strong style={{ color: 'var(--text-primary)' }}>Address:</strong> {patient.address}
          </div>
        )}
      </div>

      {/* Scans Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="card-title" style={{ margin: 0 }}>
            🩻 Associated Chest X-Ray Scans ({scans.length})
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/scan/upload', { state: { preselectPatientId: patient.id } })}
          >
            ＋ Add Scan
          </button>
        </div>

        {scans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🩻</div>
            <h3>No Scans On Record</h3>
            <p style={{ marginTop: 4, marginBottom: 16 }}>
              Upload and analyze a chest X-ray image for this patient.
            </p>
            <button
              className="btn btn-cyan"
              onClick={() => navigate('/scan/upload', { state: { preselectPatientId: patient.id } })}
            >
              Analyze First X-Ray
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scan Preview</th>
                  <th>Scan ID</th>
                  <th>Diagnosis</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Radiologist</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id} onClick={() => navigate(`/scan/${s.id}`)}>
                    <td>
                      <img
                        src={s.heatmap_url || s.image_url || '/placeholder.png'}
                        alt="X-ray preview"
                        className="scan-thumb"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </td>
                    <td>
                      <span className="mono badge badge-blue">{s.scan_id}</span>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(s.diagnosis)}`}>
                        {s.diagnosis === 'COVID-19' ? '🦠' : s.diagnosis === 'Normal' ? '✅' : '⚠️'} {s.diagnosis}
                      </span>
                    </td>
                    <td>
                      <strong className="mono" style={{ color: 'var(--accent-cyan)' }}>
                        {(s.confidence * 100).toFixed(1)}%
                      </strong>
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
                      {new Date(s.scan_date).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          className="btn btn-cyan btn-sm"
                          onClick={() => navigate(`/scan/${s.id}`)}
                        >
                          View AI
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => handleDownload(s.id, e)}
                          disabled={downloadingId === s.id}
                        >
                          {downloadingId === s.id ? 'Generating...' : '📄 PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
