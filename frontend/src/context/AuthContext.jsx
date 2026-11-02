import React, { createContext, useContext, useState, useEffect } from 'react'

const DEMO_ACCOUNTS = {
  doctor: {
    id: 'DOC-01',
    name: 'Dr. Sarah Jenkins, MD',
    role: 'doctor',
    email: 's.jenkins@easyxray.health',
    title: 'Senior Pulmonologist & Radiologist',
    department: 'Radiology & AI Triage',
    avatar: 'SJ',
    patientId: null,
  },
  patient: {
    id: 'PAT-01',
    name: 'Elena Rostova',
    role: 'patient',
    email: 'elena.rostova@example.com',
    title: 'Verified Patient',
    department: 'Outpatient Care',
    avatar: 'ER',
    patientId: 'PID-B83104',
    dob: '1994-09-22',
    bloodGroup: 'A+',
    phone: '+1 (555) 876-5432',
  },
  admin: {
    id: 'ADM-01',
    name: 'Admin Alex Mercer',
    role: 'admin',
    email: 'admin@easyxray.health',
    title: 'Healthcare System & AI Director',
    department: 'Hospital Administration & IT',
    avatar: 'AM',
    patientId: null,
  },
}

const DEFAULT_SETTINGS = {
  hospitalName: 'Easy X-Ray Diagnostic Center',
  department: 'Radiology & Pulmonology Unit',
  confidenceThreshold: 75,
  heatmapColormap: 'Jet',
  autoReportGeneration: true,
  emailAlerts: true,
  compactView: false,
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('easyxray_user')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return DEMO_ACCOUNTS.doctor
  })

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('easyxray_logged_in')
    return saved !== null ? saved === 'true' : true
  })

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('easyxray_settings')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('easyxray_user', JSON.stringify(currentUser))
    }
    localStorage.setItem('easyxray_logged_in', String(isLoggedIn))
  }, [currentUser, isLoggedIn])

  useEffect(() => {
    localStorage.setItem('easyxray_settings', JSON.stringify(settings))
  }, [settings])

  const login = (roleOrUser) => {
    if (typeof roleOrUser === 'string' && DEMO_ACCOUNTS[roleOrUser]) {
      setCurrentUser(DEMO_ACCOUNTS[roleOrUser])
    } else if (typeof roleOrUser === 'object' && roleOrUser !== null) {
      setCurrentUser(roleOrUser)
    }
    setIsLoggedIn(true)
  }

  const logout = () => {
    setIsLoggedIn(false)
  }

  const switchRole = (role) => {
    if (DEMO_ACCOUNTS[role]) {
      setCurrentUser(DEMO_ACCOUNTS[role])
      setIsLoggedIn(true)
    }
  }

  const updateProfile = (updatedFields) => {
    setCurrentUser(prev => ({ ...prev, ...updatedFields }))
  }

  const updateSettings = (updatedSettings) => {
    setSettings(prev => ({ ...prev, ...updatedSettings }))
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        settings,
        login,
        logout,
        switchRole,
        updateProfile,
        updateSettings,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
