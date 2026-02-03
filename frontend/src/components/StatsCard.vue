<template>
  <div class="bg-dark-800 rounded-xl border border-dark-700 p-6">
    <div class="flex items-center gap-3">
      <div 
        class="w-12 h-12 rounded-xl flex items-center justify-center"
        :class="bgClass"
      >
        <component :is="iconComponent" class="w-6 h-6" :class="textClass" />
      </div>
      <div>
        <p class="text-sm text-dark-400">{{ title }}</p>
        <p class="text-2xl font-bold text-white">{{ formattedValue }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  title: String,
  value: [Number, String],
  icon: String,
  color: {
    type: String,
    default: 'primary'
  }
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const colorClasses = {
  primary: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  success: { bg: 'bg-green-500/20', text: 'text-green-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

const bgClass = computed(() => colorClasses[props.color]?.bg || colorClasses.primary.bg)
const textClass = computed(() => colorClasses[props.color]?.text || colorClasses.primary.text)

const icons = {
  play: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' }),
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
  ]),
  check: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
  ]),
  database: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' })
  ]),
  mail: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' })
  ]),
}

const iconComponent = computed(() => icons[props.icon] || icons.database)
</script>
