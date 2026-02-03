<template>
  <div class="bg-dark-800 rounded-xl border border-dark-700">
    <div class="px-6 py-4 border-b border-dark-700">
      <h3 class="text-lg font-semibold text-white">Search Jobs</h3>
    </div>

    <div v-if="jobs.length === 0" class="px-6 py-12 text-center">
      <svg class="w-12 h-12 text-dark-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-dark-400">No jobs yet. Create your first search job!</p>
    </div>

    <div v-else class="divide-y divide-dark-700">
      <div 
        v-for="job in jobs" 
        :key="job.id"
        class="px-6 py-4 hover:bg-dark-750 transition-colors animate-slide-up"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Status Badge -->
            <div class="flex items-center gap-2 mb-2">
              <span 
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="statusClasses[job.status]"
              >
                <span 
                  v-if="job.status === 'running'" 
                  class="w-2 h-2 bg-current rounded-full animate-pulse"
                ></span>
                {{ statusLabels[job.status] }}
              </span>
              <span class="text-xs text-dark-500">{{ formatDate(job.createdAt) }}</span>
            </div>

            <!-- Job Info -->
            <div class="text-sm text-dark-300 space-y-1">
              <p>
                <span class="text-dark-500">Niches:</span> 
                {{ formatNiches(job.options) }}
              </p>
              <p>
                <span class="text-dark-500">Countries:</span> 
                {{ formatCountries(job.options.countries) }}
              </p>
            </div>

            <!-- Progress -->
            <div v-if="job.status === 'running' || job.status === 'completed'" class="mt-3">
              <div class="flex items-center justify-between text-xs text-dark-400 mb-1">
                <span>Progress</span>
                <span>{{ job.progress.completedQueries }} / {{ job.progress.totalQueries }}</span>
              </div>
              <div class="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
                  :style="{ width: progressPercent(job) + '%' }"
                ></div>
              </div>
            </div>

            <!-- Stats -->
            <div v-if="job.progress" class="flex items-center gap-4 mt-3 text-xs">
              <span class="text-dark-400">
                <span class="text-primary-400 font-medium">{{ job.progress.totalResults }}</span> results
              </span>
              <span class="text-dark-400">
                <span class="text-blue-400 font-medium">{{ job.progress.emailsFound }}</span> emails
              </span>
              <span v-if="job.progress.errors > 0" class="text-dark-400">
                <span class="text-red-400 font-medium">{{ job.progress.errors }}</span> errors
              </span>
            </div>

            <!-- Warnings -->
            <div v-if="job.warnings?.length > 0" class="mt-2">
              <p class="text-xs text-amber-400">
                ⚠️ {{ job.warnings.length }} warning(s)
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button 
              @click="$emit('refresh', job.id)"
              class="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              @click="$emit('delete', job.id)"
              class="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useJobsStore } from '@/stores/jobs'

defineProps({
  jobs: {
    type: Array,
    required: true
  }
})

defineEmits(['delete', 'refresh'])

const jobsStore = useJobsStore()

const statusLabels = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed'
}

const statusClasses = {
  pending: 'bg-amber-500/20 text-amber-400',
  running: 'bg-primary-500/20 text-primary-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-dark-600 text-dark-400',
  failed: 'bg-red-500/20 text-red-400'
}

function progressPercent(job) {
  if (!job.progress?.totalQueries) return 0
  return Math.round((job.progress.completedQueries / job.progress.totalQueries) * 100)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatNiches(options) {
  const nicheNames = options.niches
    .map(id => jobsStore.niches.find(n => n.id === id)?.name)
    .filter(Boolean)
  
  if (options.customNiche) {
    nicheNames.push(options.customNiche)
  }
  
  return nicheNames.length > 0 ? nicheNames.join(', ') : 'All'
}

function formatCountries(codes) {
  if (!codes || codes.length === 0) return 'Global'
  
  const names = codes
    .map(code => jobsStore.countries.find(c => c.code === code)?.name)
    .filter(Boolean)
  
  if (names.length > 3) {
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`
  }
  
  return names.join(', ')
}
</script>

<style scoped>
.bg-dark-750 {
  background-color: rgba(30, 41, 59, 0.5);
}
</style>
