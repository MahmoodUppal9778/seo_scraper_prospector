<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">Search Results</h2>
        <p class="text-dark-400 mt-1">Found {{ resultsStore.pagination.total }} opportunities</p>
      </div>
      
      <a 
        :href="resultsStore.getExportUrl()" 
        class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        download
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </a>
    </div>

    <!-- Filters -->
    <ResultsFilters @filter="onFilter" />

    <!-- Results Table -->
    <ResultsTable 
      :results="resultsStore.results" 
      :loading="resultsStore.loading"
      :pagination="resultsStore.pagination"
      @page="onPageChange"
      @sort="onSort"
    />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useResultsStore } from '@/stores/results'
import { useJobsStore } from '@/stores/jobs'
import ResultsFilters from '@/components/ResultsFilters.vue'
import ResultsTable from '@/components/ResultsTable.vue'

const resultsStore = useResultsStore()
const jobsStore = useJobsStore()

function onFilter(filters) {
  Object.entries(filters).forEach(([key, value]) => {
    resultsStore.setFilter(key, value)
  })
  resultsStore.fetchResults()
}

function onPageChange(page) {
  resultsStore.setPage(page)
  resultsStore.fetchResults()
}

function onSort({ key, order }) {
  resultsStore.setFilter('sortBy', key)
  resultsStore.setFilter('sortOrder', order)
  resultsStore.fetchResults()
}

onMounted(async () => {
  await jobsStore.fetchReferenceData()
  await resultsStore.fetchResults()
})
</script>
