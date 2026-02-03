<template>
  <div class="bg-dark-800 rounded-xl border border-dark-700 p-6">
    <h3 class="text-lg font-semibold text-white mb-6">Create New Search Job</h3>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Niches -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Select Niches</label>
        <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          <label 
            v-for="niche in jobsStore.niches" 
            :key="niche.id"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
          >
            <input 
              type="checkbox" 
              :value="niche.id" 
              v-model="form.niches"
              class="checkbox-custom"
            >
            <span class="text-sm text-dark-200">{{ niche.name }}</span>
          </label>
        </div>
      </div>

      <!-- Custom Niche -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Custom Niche (optional)</label>
        <input 
          v-model="form.customNiche"
          type="text" 
          placeholder="e.g., cryptocurrency, saas"
          class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
        >
      </div>

      <!-- Countries -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Target Countries</label>
        <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          <label 
            v-for="country in jobsStore.countries" 
            :key="country.code"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
          >
            <input 
              type="checkbox" 
              :value="country.code" 
              v-model="form.countries"
              class="checkbox-custom"
            >
            <span class="text-sm text-dark-200">{{ country.name }}</span>
          </label>
        </div>
        <p class="text-xs text-dark-500 mt-1">Leave empty for global search</p>
      </div>

      <!-- Opportunity Types -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Opportunity Types</label>
        <div class="flex flex-wrap gap-2">
          <label 
            class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
            :class="form.opportunityTypes.includes('guestPost') ? 'bg-primary-600/20 border-primary-500' : 'bg-dark-700 border-dark-600 hover:border-dark-500'"
          >
            <input 
              type="checkbox" 
              value="guestPost" 
              v-model="form.opportunityTypes"
              class="sr-only"
            >
            <span class="text-sm text-white">Guest Posts</span>
          </label>
          <label 
            class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
            :class="form.opportunityTypes.includes('linkInsertion') ? 'bg-primary-600/20 border-primary-500' : 'bg-dark-700 border-dark-600 hover:border-dark-500'"
          >
            <input 
              type="checkbox" 
              value="linkInsertion" 
              v-model="form.opportunityTypes"
              class="sr-only"
            >
            <span class="text-sm text-white">Link Insertion</span>
          </label>
        </div>
      </div>

      <!-- Max Pages -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">
          Pages per Query: {{ form.maxPages }}
        </label>
        <input 
          type="range" 
          v-model="form.maxPages"
          min="1" 
          max="20" 
          class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        >
        <div class="flex justify-between text-xs text-dark-500 mt-1">
          <span>1</span>
          <span>20</span>
        </div>
      </div>

      <!-- Submit -->
      <button 
        type="submit" 
        :disabled="!canSubmit || jobsStore.loading"
        class="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <svg v-if="jobsStore.loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ jobsStore.loading ? 'Starting...' : 'Start Search Job' }}</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useJobsStore } from '@/stores/jobs'

const emit = defineEmits(['created'])
const jobsStore = useJobsStore()

const form = ref({
  niches: [],
  customNiche: '',
  countries: [],
  opportunityTypes: ['guestPost', 'linkInsertion'],
  maxPages: 5
})

const canSubmit = computed(() => 
  (form.value.niches.length > 0 || form.value.customNiche.trim()) && 
  form.value.opportunityTypes.length > 0
)

async function handleSubmit() {
  try {
    const job = await jobsStore.createJob({
      niches: form.value.niches,
      customNiche: form.value.customNiche.trim() || null,
      countries: form.value.countries,
      opportunityTypes: form.value.opportunityTypes,
      maxPages: parseInt(form.value.maxPages)
    })
    
    emit('created', job)
    
    // Reset form
    form.value = {
      niches: [],
      customNiche: '',
      countries: [],
      opportunityTypes: ['guestPost', 'linkInsertion'],
      maxPages: 5
    }
  } catch (err) {
    console.error('Failed to create job:', err)
  }
}
</script>
