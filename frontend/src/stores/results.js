import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { resultsApi } from '@/services/api'

export const useResultsStore = defineStore('results', () => {
  const results = ref([])
  const pagination = ref({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const filters = ref({
    jobId: '',
    country: 'all',
    niche: '',
    opportunityType: 'all',
    hasEmail: false,
    domain: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const hasResults = computed(() => results.value.length > 0)

  const filterParams = computed(() => ({
    ...filters.value,
    page: pagination.value.page,
    limit: pagination.value.limit,
    hasEmail: filters.value.hasEmail ? 'true' : undefined
  }))

  // Actions
  async function fetchResults() {
    loading.value = true
    error.value = null

    try {
      const data = await resultsApi.get(filterParams.value)
      results.value = data.results
      pagination.value = data.pagination
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch results:', err)
    } finally {
      loading.value = false
    }
  }

  function setFilter(key, value) {
    filters.value[key] = value
    pagination.value.page = 1
  }

  function setPage(page) {
    pagination.value.page = page
  }

  function resetFilters() {
    filters.value = {
      jobId: '',
      country: 'all',
      niche: '',
      opportunityType: 'all',
      hasEmail: false,
      domain: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
    pagination.value.page = 1
  }

  function getExportUrl() {
    return resultsApi.getExportUrl(filterParams.value)
  }

  return {
    results,
    pagination,
    filters,
    loading,
    error,
    hasResults,
    filterParams,
    fetchResults,
    setFilter,
    setPage,
    resetFilters,
    getExportUrl
  }
})
