<template>
  <div class="min-h-screen bg-dark-900">
    <!-- Header -->
    <header class="bg-dark-800 border-b border-dark-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-bold text-white">SEO Prospector</h1>
              <p class="text-xs text-dark-400">Link Building & Guest Post Finder</p>
            </div>
          </div>
          
          <nav class="flex items-center gap-6">
            <router-link 
              to="/" 
              class="text-sm font-medium transition-colors"
              :class="$route.path === '/' ? 'text-primary-400' : 'text-dark-400 hover:text-white'"
            >
              Dashboard
            </router-link>
            <router-link 
              to="/results" 
              class="text-sm font-medium transition-colors"
              :class="$route.path === '/results' ? 'text-primary-400' : 'text-dark-400 hover:text-white'"
            >
              Results
            </router-link>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>
