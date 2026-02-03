import { v4 as uuidv4 } from 'uuid';
import { searchDuckDuckGo, fetchPageContent, buildSearchQuery, executeMultipleSearches } from './duckduckgo.js';
import { extractEmails, extractDomain, isBlockedDomain } from '../utils/emailExtractor.js';
import { saveJob, loadJob, appendResults, loadDomainCache, saveDomainCache } from '../utils/persistence.js';
import { config, searchKeywords, niches as defaultNiches, countries as defaultCountries } from '../config/index.js';

// LRU Cache implementation (simple version - can be replaced with npm package 'lru-cache')
class LRUCache {
  constructor(maxSize = 10000, ttl = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const item = this.cache.get(key);
    const now = Date.now();
    
    // Check if expired
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item;
  }

  set(key, value) {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      emails: value,
      timestamp: Date.now()
    });
  }

  has(key) {
    return this.cache.has(key);
  }

  get size() {
    return this.cache.size;
  }

  // Convert to plain object for persistence
  toObject() {
    const obj = {};
    for (const [key, value] of this.cache.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  // Load from plain object
  fromObject(obj) {
    this.cache.clear();
    for (const [key, value] of Object.entries(obj)) {
      this.cache.set(key, value);
    }
  }
}

// In-memory job store
const jobs = new Map();

// Domain cache with LRU eviction
const domainCache = new LRUCache(10000, config.cacheTtlHours * 60 * 60 * 1000);

// Load domain cache on startup
loadDomainCache().then(cache => {
  if (cache && cache instanceof Map) {
    // Convert old Map format to LRU cache
    for (const [key, value] of cache.entries()) {
      domainCache.set(key, value.emails || value);
    }
  } else if (cache && typeof cache === 'object') {
    domainCache.fromObject(cache);
  }
  console.log(`Loaded ${domainCache.size} domains from cache`);
});

/**
 * Create a new search job
 * @param {object} options 
 * @returns {object} - Job object
 */
export async function createJob(options) {
  const {
    niches = [],
    countries = [],
    opportunityTypes = ['guestPost', 'linkInsertion'],
    maxPages = 5,
    customNiche = null,
  } = options;

  const job = {
    id: uuidv4(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    options: {
      niches,
      countries,
      opportunityTypes,
      maxPages: Math.min(maxPages, config.maxPagesPerQuery),
      customNiche,
    },
    progress: {
      totalQueries: 0,
      completedQueries: 0,
      totalResults: 0,
      processedUrls: 0,
      emailsFound: 0,
      errors: 0,
      retries: 0,
    },
    errors: [],
    warnings: [],
  };

  // Calculate total queries (now per search, not per page)
  const nicheKeywords = getNicheKeywords(niches, customNiche);
  const countryList = countries.length > 0 ? countries : [null];
  const opportunityKeywords = getOpportunityKeywords(opportunityTypes);

  job.progress.totalQueries = nicheKeywords.length * countryList.length * opportunityKeywords.length;

  jobs.set(job.id, job);
  await saveJob(job);

  // Start processing in background
  processJob(job.id).catch(err => {
    console.error(`Job ${job.id} failed:`, err);
    updateJobStatus(job.id, 'failed', err.message);
  });

  return job;
}

/**
 * Get job by ID
 * @param {string} jobId 
 * @returns {object|null}
 */
export async function getJob(jobId) {
  let job = jobs.get(jobId);
  if (!job) {
    job = await loadJob(jobId);
    if (job) {
      jobs.set(jobId, job);
    }
  }
  return job;
}

/**
 * Get all jobs
 * @returns {object[]}
 */
export function getAllJobs() {
  return Array.from(jobs.values()).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Cancel a job
 * @param {string} jobId 
 */
export async function cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (job && (job.status === 'running' || job.status === 'pending')) {
    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  }
}

/**
 * Update job status
 * @param {string} jobId 
 * @param {string} status 
 * @param {string} [errorMessage] 
 */
async function updateJobStatus(jobId, status, errorMessage = null) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (errorMessage) {
      job.errors.push({ message: errorMessage, timestamp: new Date().toISOString() });
    }
    await saveJob(job);
  }
}

/**
 * Process a search job with circuit breaker pattern
 * @param {string} jobId 
 */
async function processJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  const seenDomains = new Set();
  const results = [];
  
  // Circuit breaker configuration
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const nicheKeywords = getNicheKeywords(job.options.niches, job.options.customNiche);
  const countryList = job.options.countries.length > 0 ? job.options.countries : [null];
  const opportunityKeywords = getOpportunityKeywords(job.options.opportunityTypes);

  // Generate all search configurations for sequential execution
  const searchConfigs = [];
  for (const nicheKeyword of nicheKeywords) {
    for (const country of countryList) {
      for (const oppKeyword of opportunityKeywords) {
        const tld = country ? 
          defaultCountries.find(c => c.code === country)?.tld : null;
        
        const countryName = country ?
          defaultCountries.find(c => c.code === country)?.name : null;
        
        const query = buildSearchQuery(oppKeyword, nicheKeyword, tld, countryName);
        const region = country ? `${country}-en` : 'wt-wt';

        searchConfigs.push({
          query,
          region,
          maxPages: job.options.maxPages,
          metadata: {
            nicheKeyword,
            country,
            oppKeyword,
          }
        });
      }
    }
  }

  console.log(`\n🚀 Job ${jobId}: Processing ${searchConfigs.length} queries sequentially to avoid bot detection\n`);

  // Execute all searches sequentially with automatic delays
  const searchResults = await executeMultipleSearches(searchConfigs);

  // Process results from all queries
  for (const searchResult of searchResults) {
    if (job.status === 'cancelled') break;

    const { metadata } = searchConfigs.find(c => c.query === searchResult.query);

    if (searchResult.success) {
      // Reset consecutive failures on success
      consecutiveFailures = 0;
      
      // Warn if no results found
      if (searchResult.results.length === 0) {
        job.warnings.push({
          message: `No results found for query: ${searchResult.query}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Process each URL from this search
      for (const result of searchResult.results) {
        if (job.status === 'cancelled') break;

        const domain = extractDomain(result.url);
        if (!domain || seenDomains.has(domain) || isBlockedDomain(domain)) {
          continue;
        }

        seenDomains.add(domain);
        job.progress.processedUrls++;

        // Check domain cache
        let emails = [];
        const cached = domainCache.get(domain);
        
        if (cached) {
          emails = cached.emails || [];
        } else {
          // Fetch and extract emails with retry tracking
          try {
            const content = await fetchPageContent(result.url);
            if (content) {
              emails = extractEmails(content);
              domainCache.set(domain, emails);
            }
          } catch (error) {
            console.warn(`Failed to fetch ${result.url}:`, error.message);
            job.progress.retries++;
          }
        }

        const opportunity = {
          id: uuidv4(),
          jobId,
          url: result.url,
          domain,
          title: result.title,
          snippet: result.snippet,
          niche: metadata.nicheKeyword,
          country: metadata.country || 'global',
          opportunityType: categorizeOpportunity(metadata.oppKeyword),
          emails,
          hasEmail: emails.length > 0,
          createdAt: new Date().toISOString(),
        };

        results.push(opportunity);
        job.progress.totalResults++;
        if (emails.length > 0) {
          job.progress.emailsFound += emails.length;
        }
      }

      job.progress.completedQueries++;
    } else {
      // Search failed - increment circuit breaker
      consecutiveFailures++;
      job.progress.errors++;
      job.warnings.push({
        message: `Query failed: ${searchResult.query}`,
        error: searchResult.error || 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Circuit breaker: stop job if too many consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`\n❌ Circuit breaker triggered for job ${jobId} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures\n`);
        job.warnings.push({
          message: `Job stopped: ${MAX_CONSECUTIVE_FAILURES} consecutive query failures detected (likely rate limited)`,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    // Save progress after each query
    job.updatedAt = new Date().toISOString();
    await saveJob(job);

    // Save results incrementally (reduced batch size to prevent memory issues)
    if (results.length >= 25) {
      await appendResults(jobId, results);
      results.splice(0, results.length); // Clear array properly
    }
  }

  // Save any remaining results
  if (results.length > 0) {
    await appendResults(jobId, results);
  }

  // Save domain cache (convert LRU to object)
  await saveDomainCache(domainCache.toObject());

  // Update final status
  if (job.status !== 'cancelled') {
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      job.status = 'failed';
    } else {
      job.status = 'completed';
    }
    job.completedAt = new Date().toISOString();
  }
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  console.log(`\n✅ Job ${jobId} ${job.status}: ${job.progress.totalResults} results, ${job.progress.emailsFound} emails found\n`);
}

/**
 * Get niche keywords from selected niches
 * @param {string[]} selectedNiches 
 * @param {string} customNiche 
 * @returns {string[]}
 */
function getNicheKeywords(selectedNiches, customNiche) {
  const keywords = [];
  
  for (const nicheId of selectedNiches) {
    const niche = defaultNiches.find(n => n.id === nicheId);
    if (niche) {
      keywords.push(...niche.keywords.slice(0, 2)); // Use first 2 keywords per niche
    }
  }

  if (customNiche) {
    keywords.push(customNiche);
  }

  return keywords.length > 0 ? keywords : ['blog'];
}

/**
 * Get opportunity keywords from types
 * @param {string[]} types 
 * @returns {string[]}
 */
function getOpportunityKeywords(types) {
  const keywords = [];
  
  for (const type of types) {
    if (searchKeywords[type]) {
      keywords.push(...searchKeywords[type].slice(0, 3)); // Use first 3 keywords per type
    }
  }

  return keywords.length > 0 ? keywords : searchKeywords.guestPost.slice(0, 3);
}

/**
 * Categorize opportunity type from keyword
 * @param {string} keyword 
 * @returns {string}
 */
function categorizeOpportunity(keyword) {
  const guestKeywords = ['write for us', 'guest post', 'submit article', 'contribute', 'guest author', 'guest blog'];
  const linkKeywords = ['link insertion', 'sponsored', 'paid', 'advertise', 'niche edit'];

  const lowerKeyword = keyword.toLowerCase();
  
  if (guestKeywords.some(k => lowerKeyword.includes(k))) {
    return 'guest_post';
  }
  if (linkKeywords.some(k => lowerKeyword.includes(k))) {
    return 'link_insertion';
  }
  return 'other';
}

/**
 * Initialize jobs from disk on startup
 */
export async function initializeJobs() {
  const { loadAllJobs } = await import('../utils/persistence.js');
  const savedJobs = await loadAllJobs();
  
  // Only resume jobs from last 24 hours
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  for (const job of savedJobs) {
    jobs.set(job.id, job);
    
    const jobAge = now - new Date(job.createdAt).getTime();
    const isStale = jobAge > ONE_DAY_MS;
    
    // Resume pending/running jobs only if not stale
    if (job.status === 'pending' || job.status === 'running') {
      if (isStale) {
        // Mark stale jobs as failed
        job.status = 'failed';
        job.errors.push({
          message: 'Job marked as failed due to server restart (>24 hours old)',
          timestamp: new Date().toISOString(),
        });
        await saveJob(job);
        console.log(`Marked stale job ${job.id} as failed (age: ${Math.round(jobAge / 1000 / 60)} minutes)`);
      } else {
        // Resume recent jobs
        job.status = 'pending';
        job.warnings.push({
          message: 'Job resumed after server restart',
          timestamp: new Date().toISOString(),
        });
        await saveJob(job);
        
        processJob(job.id).catch(err => {
          console.error(`Failed to resume job ${job.id}:`, err);
          updateJobStatus(job.id, 'failed', err.message);
        });
        
        console.log(`Resumed job ${job.id} (age: ${Math.round(jobAge / 1000 / 60)} minutes)`);
      }
    }
  }

  console.log(`Loaded ${savedJobs.length} jobs from disk`);
}