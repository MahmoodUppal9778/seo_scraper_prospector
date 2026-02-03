<template>
  <div class="bg-dark-800 rounded-xl border border-dark-700 p-4">
    <div class="flex flex-wrap items-center gap-4">
      <!-- Country Filter -->
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs text-dark-400 mb-1">Country</label>
        <select 
          v-model="filters.country"
          @change="emitFilters"
          class="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Countries</option>
          <option value="global">Global</option>
          <option v-for="country in jobsStore.countries" :key="country.code" :value="country.code">
            {{ country.name }}
          </option>
        </select>
      </div>

      <!-- Opportunity Type Filter -->
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs text-dark-400 mb-1">Opportunity Type</label>
        <select 
          v-model="filters.opportunityType"
          @change="emitFilters"
          class="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Types</option>
          <option value="guest_post">Guest Post</option>
          <option value="link_insertion">Link Insertion</option>
        </select>
      </div>

      <!-- Domain Search -->
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs text-dark-400 mb-1">Search Domain</label>
        <input 
          v-model="filters.domain"
          @input="debouncedEmit"
          type="text" 
          placeholder="e.g., techblog.com"
          class="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
      </div>

      <!-- Niche Search -->
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs text-dark-400 mb-1">Search Niche</label>
        <input 
          v-model="filters.niche"
          @input="debouncedEmit"
          type="text" 
          placeholder="e.g., marketing"
          class="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
      </div>

      <!-- Has Email Toggle -->
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="filters.hasEmail"
            @change="emitFilters"
            class="checkbox-custom"
          >
          <span class="text-sm text-dark-300">Has Email</span>
        </label>
      </div>

      <!-- Reset Button -->
      <button 
        @click="resetFilters"
        class="px-4 py-2 text-sm text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useJobsStore } from '@/stores/jobs'

const emit = defineEmits(['filter'])
const jobsStore = useJobsStore()

const filters = ref({
  country: 'all',
  opportunityType: 'all',
  domain: '',
  niche: '',
  hasEmail: false
})

function emitFilters() {
  emit('filter', { ...filters.value })
}

const debouncedEmit = useDebounceFn(emitFilters, 300)

function resetFilters() {
  filters.value = {
    country: 'all',
    opportunityType: 'all',
    domain: '',
    niche: '',
    hasEmail: false
  }
  emitFilters()
}
</script>
