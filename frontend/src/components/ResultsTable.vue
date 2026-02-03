<template>
  <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
    <!-- Loading State -->
    <div v-if="loading" class="p-8 text-center">
      <svg class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-dark-400">Loading results...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="results.length === 0" class="p-8 text-center">
      <svg class="w-12 h-12 text-dark-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p class="text-dark-400">No results found. Try adjusting your filters or start a new search job.</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th class="w-[300px]">
              <button 
                @click="sort('domain')" 
                class="flex items-center gap-1 hover:text-white transition-colors"
              >
                Domain
                <SortIcon :active="sortBy === 'domain'" :order="sortOrder" />
              </button>
            </th>
            <th class="w-[250px]">Title</th>
            <th>
              <button 
                @click="sort('niche')" 
                class="flex items-center gap-1 hover:text-white transition-colors"
              >
                Niche
                <SortIcon :active="sortBy === 'niche'" :order="sortOrder" />
              </button>
            </th>
            <th>
              <button 
                @click="sort('country')" 
                class="flex items-center gap-1 hover:text-white transition-colors"
              >
                Country
                <SortIcon :active="sortBy === 'country'" :order="sortOrder" />
              </button>
            </th>
            <th>Type</th>
            <th>Emails</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in results" :key="result.id" class="group">
            <td>
              <a 
                :href="result.url" 
                target="_blank"
                class="text-primary-400 hover:text-primary-300 hover:underline font-medium truncate block max-w-[280px]"
              >
                {{ result.domain }}
              </a>
            </td>
            <td>
              <p class="text-dark-200 truncate max-w-[230px]" :title="result.title">
                {{ result.title || '-' }}
              </p>
            </td>
            <td>
              <span class="text-dark-300 capitalize">{{ result.niche }}</span>
            </td>
            <td>
              <span class="text-dark-300 capitalize">{{ result.country }}</span>
            </td>
            <td>
              <span 
                class="inline-flex px-2 py-1 rounded text-xs font-medium"
                :class="result.opportunityType === 'guest_post' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'"
              >
                {{ formatType(result.opportunityType) }}
              </span>
            </td>
            <td>
              <div v-if="result.emails?.length > 0" class="space-y-1">
                <a 
                  v-for="email in result.emails.slice(0, 2)" 
                  :key="email"
                  :href="'mailto:' + email"
                  class="text-sm text-primary-400 hover:text-primary-300 hover:underline block truncate max-w-[200px]"
                >
                  {{ email }}
                </a>
                <span v-if="result.emails.length > 2" class="text-xs text-dark-500">
                  +{{ result.emails.length - 2 }} more
                </span>
              </div>
              <span v-else class="text-dark-500">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="px-6 py-4 border-t border-dark-700 flex items-center justify-between">
      <p class="text-sm text-dark-400">
        Showing {{ (pagination.page - 1) * pagination.limit + 1 }} - 
        {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }}
      </p>
      
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('page', pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-lg transition-colors"
        >
          Previous
        </button>
        
        <div class="flex items-center gap-1">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="$emit('page', page)"
            class="w-8 h-8 text-sm rounded-lg transition-colors"
            :class="page === pagination.page ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-700'"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="$emit('page', pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-lg transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'

const props = defineProps({
  results: {
    type: Array,
    required: true
  },
  loading: Boolean,
  pagination: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['page', 'sort'])

const sortBy = ref('createdAt')
const sortOrder = ref('desc')

function sort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
  emit('sort', { key: sortBy.value, order: sortOrder.value })
}

function formatType(type) {
  const types = {
    guest_post: 'Guest Post',
    link_insertion: 'Link Insert',
    other: 'Other'
  }
  return types[type] || type
}

const visiblePages = computed(() => {
  const total = props.pagination.totalPages
  const current = props.pagination.page
  const pages = []
  
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, 5)
    } else {
      start = Math.max(1, total - 4)
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Sort Icon Component
const SortIcon = {
  props: ['active', 'order'],
  setup(props) {
    return () => h('svg', {
      class: ['w-4 h-4 transition-colors', props.active ? 'text-primary-400' : 'text-dark-600'],
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, [
      props.active && props.order === 'asc' 
        ? h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 15l7-7 7 7' })
        : h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 9l-7 7-7-7' })
    ])
  }
}
</script>
