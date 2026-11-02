import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Dashboard
export const getDashboard = () => api.get('/dashboard/')

// Patients
export const getPatients = (q = '') => api.get('/patients/', { params: { q } })
export const createPatient = (data) => api.post('/patients/create/', data)
export const getPatient = (id) => api.get(`/patients/${id}/`)
export const updatePatient = (id, data) => api.put(`/patients/${id}/`, data)
export const deletePatient = (id) => api.delete(`/patients/${id}/`)

// Scans
export const getScans = (params = {}) => api.get('/scans/', { params })
export const validateImage = (formData) =>
  api.post('/scans/validate/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const uploadScan = (formData) =>
  api.post('/scans/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getScan = (id) => api.get(`/scans/${id}/`)
export const downloadReport = (id) =>
  api.get(`/scans/${id}/report/`, { responseType: 'blob' })

export default api
