import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const jobsApi = {
  // Create a new job
  async create(data) {
    const response = await api.post('/jobs', data)
    return response.data
  },

  // Get all jobs
  async getAll() {
    const response = await api.get('/jobs')
    return response.data
  },

  // Get job by ID
  async getById(id) {
    const response = await api.get(`/jobs/${id}`)
    return response.data
  },

  // Delete job
  async delete(id) {
    const response = await api.delete(`/jobs/${id}`)
    return response.data
  }
}

export const resultsApi = {
  // Get results with pagination and filters
  async get(params = {}) {
    const response = await api.get('/results', { params })
    return response.data
  },

  // Export results to CSV
  getExportUrl(params = {}) {
    const searchParams = new URLSearchParams(params)
    return `/api/results/export?${searchParams.toString()}`
  }
}

export const referenceApi = {
  // Get available countries
  async getCountries() {
    const response = await api.get('/countries')
    return response.data
  },

  // Get available niches
  async getNiches() {
    const response = await api.get('/niches')
    return response.data
  }
}

export default api
