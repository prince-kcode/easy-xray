import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPatients } from '../api'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const loadPatients = (query = '') => {
    setLoading(true)
    getPatients(query)
      .then(r => setPatients(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Patient Directory</h1>
          <p className="page-sub">Manage registered patients and their clinical imaging records</p>
        </div>
        <Link to="/patients/add" className="btn btn-cyan">
          ＋ Register Patient
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card mb-20" style={{ padding: '14px 18px' }}>
        <div className="search-wrap">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder="Search patients by name, PID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" />
          <div style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>Loading patient records...</div>
        </div>
      ) : patients.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Patients Found</h3>
          <p style={{ marginTop: 6, marginBottom: 18 }}>
            {search ? `No patient matches "${search}"` : 'Get started by registering your first patient.'}
          </p>
          <Link to="/patients/add" className="btn btn-primary">
            ＋ Add First Patient
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Age / Sex</th>
                  <th>Blood Group</th>
                  <th>Contact</th>
                  <th>Scans</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="patient-avatar">
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="mono badge badge-blue">{p.patient_id}</span>
                    </td>
                    <td>
                      <span>{p.age ?? '—'} yrs</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({p.gender || '—'})</span>
                    </td>
                    <td>
                      {p.blood_group ? (
                        <span className="badge badge-pending">{p.blood_group}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{p.phone || '—'}</div>
                    </td>
                    <td>
                      <span className="badge badge-normal" style={{ fontSize: 11 }}>
                        {p.scan_count || 0} scan{(p.scan_count || 0) === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/patients/${p.id}`)}
                          title="View Profile"
                        >
                          Profile
                        </button>
                        <button
                          className="btn btn-cyan btn-sm"
                          onClick={() => navigate('/scan/upload')}
                          title="New Scan"
                        >
                          ＋ Scan
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
