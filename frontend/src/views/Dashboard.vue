<template>
  <div class="space-y-8">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCard 
        title="Active Jobs" 
        :value="jobsStore.activeJobs.length"
        icon="play"
        color="primary"
      />
      <StatsCard 
        title="Completed Jobs" 
        :value="jobsStore.completedJobs.length"
        icon="check"
        color="success"
      />
      <StatsCard 
        title="Total Results" 
        :value="totalResults"
        icon="database"
        color="blue"
      />
      <StatsCard 
        title="Emails Found" 
        :value="totalEmails"
        icon="mail"
        color="purple"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Create Job Form -->
      <div class="lg:col-span-1">
        <CreateJobForm @created="onJobCreated" />
      </div>

      <!-- Jobs List -->
      <div class="lg:col-span-2">
        <JobsList 
          :jobs="jobsStore.jobs" 
          @delete="onDeleteJob"
          @refresh="onRefreshJob"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useJobsStore } from '@/stores/jobs'
import StatsCard from '@/components/StatsCard.vue'
import CreateJobForm from '@/components/CreateJobForm.vue'
import JobsList from '@/components/JobsList.vue'

const jobsStore = useJobsStore()

const totalResults = computed(() => 
  jobsStore.jobs.reduce((sum, job) => sum + (job.progress?.totalResults || 0), 0)
)

const totalEmails = computed(() => 
  jobsStore.jobs.reduce((sum, job) => sum + (job.progress?.emailsFound || 0), 0)
)

async function onJobCreated(job) {
  // Job is already added to store in createJob
}

async function onDeleteJob(id) {
  await jobsStore.deleteJob(id)
}

async function onRefreshJob(id) {
  await jobsStore.refreshJob(id)
}

onMounted(() => {
  jobsStore.initialize()
})
</script>
