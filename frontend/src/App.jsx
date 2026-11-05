import React, { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import SettingsModal from './components/SettingsModal'
import LoginView from './pages/LoginView'

// Pages
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import AddPatient from './pages/AddPatient'
import PatientDetail from './pages/PatientDetail'
import UploadScan from './pages/UploadScan'
import ScanResult from './pages/ScanResult'
import ScanList from './pages/ScanList'
import PatientPortal from './pages/PatientPortal'
import AdminDashboard from './pages/AdminDashboard'

function Sidebar({ isOpen, onClose }) {
  const { currentUser } = useAuth()
  const role = currentUser?.role || 'doctor'

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">🫁</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-title">Easy X-Ray</div>
            <div className="sidebar-sub">AI Diagnostic System</div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* DOCTOR NAVIGATION */}
          {role === 'doctor' && (
            <>
              <div className="nav-label">Clinical Workflow</div>
              <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📊</span> Clinical Dashboard
              </NavLink>
              <NavLink to="/scan/upload" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🔬</span> Analyze X-Ray
              </NavLink>
              <NavLink to="/scans" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📋</span> Scan Records
              </NavLink>
              <div className="nav-label" style={{ marginTop: 12 }}>Patient Records</div>
              <NavLink to="/patients" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">👥</span> All Patients
              </NavLink>
              <NavLink to="/patients/add" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">➕</span> Register Patient
              </NavLink>
            </>
          )}

          {/* PATIENT NAVIGATION */}
          {role === 'patient' && (
            <>
              <div className="nav-label">Patient Portal</div>
              <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🏠</span> My Health Summary
              </NavLink>
              <NavLink to="/my-scans" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🫁</span> My Scans & Reports
              </NavLink>
              <div className="nav-label" style={{ marginTop: 12 }}>Account</div>
              <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">👤</span> My Patient Profile
              </NavLink>
            </>
          )}

          {/* ADMIN NAVIGATION */}
          {role === 'admin' && (
            <>
              <div className="nav-label">Administration</div>
              <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🛡️</span> Admin Overview
              </NavLink>
              <NavLink to="/scans" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">📋</span> Scan Logs & Audits
              </NavLink>
              <NavLink to="/patients" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">👥</span> Patient Directory
              </NavLink>
              <NavLink to="/scan/upload" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="nav-icon">🔬</span> AI Pipeline Test
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="ai-badge">
            <div className="ai-dot" />
            <div>
              <div className="ai-text">
                {role === 'patient' ? 'Patient Portal' : (role === 'admin' ? 'Admin Ops Active' : 'AI Engine Active')}
              </div>
              <div className="ai-sub">
                {role === 'patient' ? 'ID: PID-B83104' : 'ResNet-50 · Grad-CAM'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({ title, onOpenSettings, onToggleSidebar }) {
  const { currentUser, switchRole, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleTagClass = {
    doctor: 'role-doctor',
    patient: 'role-patient',
    admin: 'role-admin',
  }[currentUser?.role || 'doctor']

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div className="breadcrumb">
          <span>🏠</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-title">{title}</span>
          <span className={`profile-role-tag ${roleTagClass} breadcrumb-role`}>
            {currentUser?.role?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="header-right">
        {currentUser?.role !== 'patient' ? (
          <button className="btn btn-cyan btn-sm header-action-btn" onClick={() => navigate('/scan/upload')}>
            ＋ <span className="btn-text">New Scan</span>
          </button>
        ) : (
          <button className="btn btn-outline btn-sm header-action-btn" onClick={() => navigate('/')}>
            📋 <span className="btn-text">My Records</span>
          </button>
        )}

        {/* Profile Trigger & Dropdown */}
        <div className="profile-menu-wrap" ref={menuRef}>
          <div
            className="profile-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Click to view profile, settings, switch role, or log out"
          >
            <div className="avatar">
              {currentUser?.avatar || 'DR'}
            </div>
            <span className="profile-user-name">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'User'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
          </div>

          {menuOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-user-header">
                <div className="avatar" style={{ width: 42, height: 42, fontSize: 16 }}>
                  {currentUser?.avatar || 'DR'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dropdown-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser?.name}
                  </div>
                  <div className="dropdown-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser?.email}
                  </div>
                  <span className={`profile-role-tag ${roleTagClass}`} style={{ marginTop: 4, display: 'inline-block' }}>
                    ● {currentUser?.role?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="dropdown-section-title">Switch Active Role:</div>
              <div className="role-switcher-row">
                <div
                  className={`role-switch-pill ${currentUser?.role === 'doctor' ? 'active' : ''}`}
                  onClick={() => { switchRole('doctor'); setMenuOpen(false); navigate('/'); }}
                >
                  🩺 Doctor
                </div>
                <div
                  className={`role-switch-pill ${currentUser?.role === 'patient' ? 'active' : ''}`}
                  onClick={() => { switchRole('patient'); setMenuOpen(false); navigate('/'); }}
                >
                  👤 Patient
                </div>
                <div
                  className={`role-switch-pill ${currentUser?.role === 'admin' ? 'active' : ''}`}
                  onClick={() => { switchRole('admin'); setMenuOpen(false); navigate('/'); }}
                >
                  🛡️ Admin
                </div>
              </div>

              {/* Menu Actions */}
              <div className="dropdown-menu-list">
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenSettings()
                  }}
                >
                  <span>⚙️</span>
                  <span>Settings & Preferences</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-item logout"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                >
                  <span>🚪</span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MainRoutes({ onOpenSettings }) {
  const { currentUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = currentUser?.role || 'doctor'

  const toggleSidebar = () => setSidebarOpen(prev => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main">
        {/* DOCTOR ROUTES */}
        {role === 'doctor' && (
          <Routes>
            <Route path="/" element={<><Header title="Clinical Dashboard" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><Dashboard /></>} />
            <Route path="/patients" element={<><Header title="Patients" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><Patients /></>} />
            <Route path="/patients/add" element={<><Header title="Register Patient" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><AddPatient /></>} />
            <Route path="/patients/:id" element={<><Header title="Patient Detail" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientDetail /></>} />
            <Route path="/scan/upload" element={<><Header title="Analyze X-Ray" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><UploadScan /></>} />
            <Route path="/scan/:id" element={<><Header title="Scan Result" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><ScanResult /></>} />
            <Route path="/scans" element={<><Header title="Scan Records" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><ScanList /></>} />
            <Route path="*" element={<><Header title="Clinical Dashboard" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><Dashboard /></>} />
          </Routes>
        )}

        {/* PATIENT ROUTES */}
        {role === 'patient' && (
          <Routes>
            <Route path="/" element={<><Header title="My Health Portal" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientPortal /></>} />
            <Route path="/my-scans" element={<><Header title="My Scans & Reports" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientPortal /></>} />
            <Route path="/profile" element={<><Header title="My Patient Profile" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientPortal /></>} />
            <Route path="/scan/:id" element={<><Header title="Scan Report Detail" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><ScanResult /></>} />
            <Route path="*" element={<><Header title="My Health Portal" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientPortal /></>} />
          </Routes>
        )}

        {/* ADMIN ROUTES */}
        {role === 'admin' && (
          <Routes>
            <Route path="/" element={<><Header title="Admin Control Center" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><AdminDashboard /></>} />
            <Route path="/admin/telemetry" element={<><Header title="AI Telemetry & Logs" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><AdminDashboard /></>} />
            <Route path="/patients" element={<><Header title="Patients Directory" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><Patients /></>} />
            <Route path="/patients/:id" element={<><Header title="Patient Detail" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><PatientDetail /></>} />
            <Route path="/scan/upload" element={<><Header title="AI Pipeline Verification" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><UploadScan /></>} />
            <Route path="/scan/:id" element={<><Header title="Scan Audit View" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><ScanResult /></>} />
            <Route path="/scans" element={<><Header title="All Scans & Audit Trail" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><ScanList /></>} />
            <Route path="*" element={<><Header title="Admin Control Center" onOpenSettings={onOpenSettings} onToggleSidebar={toggleSidebar} /><AdminDashboard /></>} />
          </Routes>
        )}
      </div>
    </div>
  )
}

function AppContent() {
  const { isLoggedIn } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (!isLoggedIn) {
    return <LoginView />
  }

  return (
    <>
      <MainRoutes onOpenSettings={() => setIsSettingsOpen(true)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
