import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createPatient } from '../api'

export default function AddPatient() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
    phone: '',
    email: '',
    address: '',
  })

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return setError('Please enter first name and last name.')
    }
    if (!form.date_of_birth) {
      return setError('Please provide patient date of birth.')
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await createPatient(form)
      navigate(`/patients/${res.data.id}`)
    } catch (err) {
      const errData = err.response?.data
      if (typeof errData === 'object') {
        const msg = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
        setError(msg || 'Failed to register patient.')
      } else {
        setError('Failed to register patient. Please check the inputs.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Register New Patient</h1>
          <p className="page-sub">Create a medical record to associate chest X-ray scans and diagnostic reports</p>
        </div>
        <Link to="/patients" className="btn btn-outline btn-sm">
          ← Back to Patients
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name <span className="req">*</span></label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                placeholder="e.g. John"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="req">*</span></label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                placeholder="e.g. Doe"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Date of Birth <span className="req">*</span></label>
              <input
                type="date"
                name="date_of_birth"
                className="form-control"
                value={form.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender <span className="req">*</span></label>
              <select
                name="gender"
                className="form-control"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                name="blood_group"
                className="form-control"
                value={form.blood_group}
                onChange={handleChange}
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
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                placeholder="+1 (555) 019-2834"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="patient@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address</label>
            <textarea
              name="address"
              className="form-control"
              placeholder="Street address, city, state, postal code..."
              value={form.address}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/patients')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-cyan"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : '✓ Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
