import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jobsApi, referenceApi } from '@/services/api'

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref([])
  const countries = ref([])
  const niches = ref([])
  const loading = ref(false)
  const error = ref(null)
  const pollingInterval = ref(null)

  // Computed
  const activeJobs = computed(() => 
    jobs.value.filter(j => j.status === 'running' || j.status === 'pending')
  )

  const completedJobs = computed(() => 
    jobs.value.filter(j => j.status === 'completed')
  )

  // Actions
  async function fetchJobs() {
    try {
      jobs.value = await jobsApi.getAll()
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch jobs:', err)
    }
  }

  async function fetchReferenceData() {
    try {
      const [countriesData, nichesData] = await Promise.all([
        referenceApi.getCountries(),
        referenceApi.getNiches()
      ])
      countries.value = countriesData
      niches.value = nichesData
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch reference data:', err)
    }
  }

  async function createJob(data) {
    loading.value = true
    error.value = null
    
    try {
      const job = await jobsApi.create(data)
      jobs.value.unshift(job)
      startPolling()
      return job
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteJob(id) {
    try {
      await jobsApi.delete(id)
      jobs.value = jobs.value.filter(j => j.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function refreshJob(id) {
    try {
      const job = await jobsApi.getById(id)
      const index = jobs.value.findIndex(j => j.id === id)
      if (index !== -1) {
        jobs.value[index] = job
      }
      return job
    } catch (err) {
      console.error('Failed to refresh job:', err)
    }
  }

  function startPolling() {
    if (pollingInterval.value) return

    pollingInterval.value = setInterval(async () => {
      const activeJobIds = activeJobs.value.map(j => j.id)
      
      if (activeJobIds.length === 0) {
        stopPolling()
        return
      }

      for (const id of activeJobIds) {
        await refreshJob(id)
      }
    }, 2000)
  }

  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }

  async function initialize() {
    await Promise.all([fetchJobs(), fetchReferenceData()])
    
    if (activeJobs.value.length > 0) {
      startPolling()
    }
  }

  return {
    jobs,
    countries,
    niches,
    loading,
    error,
    activeJobs,
    completedJobs,
    fetchJobs,
    fetchReferenceData,
    createJob,
    deleteJob,
    refreshJob,
    startPolling,
    stopPolling,
    initialize
  }
})
