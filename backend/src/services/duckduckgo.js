import axios from 'axios';
import { parse } from 'node-html-parser';
import { config } from '../config/index.js';

const USER_AGENTS = [
  // Desktop Chrome versions
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  // Firefox versions
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  // Safari versions
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  // Mobile agents
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36',
];

// Track user agent rotation
let currentUserAgentIndex = 0;

// Track consecutive timeout errors for IP block detection
let consecutiveTimeouts = 0;
const TIMEOUT_THRESHOLD = 3; // Number of consecutive timeouts to trigger IP block warning

/**
 * Enhanced logger with timestamp and context
 */
const logger = {
  info: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️  ${message}`, Object.keys(context).length ? context : '');
  },
  
  success: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`, Object.keys(context).length ? context : '');
  },
  
  warn: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️  ${message}`, Object.keys(context).length ? context : '');
  },
  
  error: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`, Object.keys(context).length ? context : '');
  },
  
  debug: (message, context = {}) => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔍 ${message}`, Object.keys(context).length ? context : '');
    }
  },

  ipBlock: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`\n${'='.repeat(80)}`);
    console.error(`[${timestamp}] 🚫 IP BLOCK WARNING: ${message}`);
    console.error(`${'='.repeat(80)}`);
    if (Object.keys(context).length) {
      console.error(JSON.stringify(context, null, 2));
    }
    console.error(`${'='.repeat(80)}\n`);
  }
};

/**
 * Get rotating user agent (cycles through list)
 * @returns {string}
 */
function getRotatingUserAgent() {
  const agent = USER_AGENTS[currentUserAgentIndex];
  currentUserAgentIndex = (currentUserAgentIndex + 1) % USER_AGENTS.length;
  
  if (process.env.DEBUG === 'true') {
    logger.debug('Selected user agent', { 
      index: currentUserAgentIndex,
      agent: agent.substring(0, 50) + '...' 
    });
  }
  
  return agent;
}

/**
 * Get random user agent (for backward compatibility)
 * @returns {string}
 */
function getRandomUserAgent() {
  const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  if (process.env.DEBUG === 'true') {
    logger.debug('Selected random user agent', { agent: agent.substring(0, 50) + '...' });
  }
  return agent;
}

/**
 * Sleep for specified milliseconds with human-like variation
 * @param {number} ms 
 */
function sleep(ms) {
  // Add random jitter (±20%) to make timing more human-like
  const jitter = ms * 0.2 * (Math.random() * 2 - 1);
  const actualDelay = Math.max(ms + jitter, ms * 0.5);
  if (process.env.DEBUG === 'true') {
    logger.debug(`Sleeping for ${Math.round(actualDelay)}ms (base: ${ms}ms)`);
  }
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

/**
 * Calculate exponential backoff delay with human-like patterns
 * @param {number} attempt 
 * @returns {number}
 */
function getBackoffDelay(attempt) {
  // Increased base delay to 60 seconds (1 minute)
  const baseDelay = 60000;
  const maxDelay = 300000; // 5 minutes max
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = delay * 0.3 * (Math.random() * 2 - 1);
  return Math.max(delay + jitter, baseDelay);
}

/**
 * Human-like delay between actions - INCREASED DELAYS
 * @param {string} context - 'initial' | 'scroll' | 'fetch' | 'reading' | 'between_queries'
 * @returns {Promise<void>}
 */
async function humanLikeDelay(context = 'default') {
  let baseDelay = config.requestDelayMs || 1000;
  
  switch (context) {
    case 'initial':
      // Initial page load - humans take 3-7 seconds to scan first results
      baseDelay = Math.random() * 4000 + 3000;
      break;
    case 'scroll':
      // Scrolling and clicking "load more" - 8-15 seconds
      baseDelay = Math.random() * 7000 + 8000;
      break;
    case 'reading':
      // Reading results on page - 3-6 seconds
      baseDelay = Math.random() * 3000 + 3000;
      break;
    case 'fetch':
      // Clicking a link - 3-5 seconds
      baseDelay = Math.random() * 2000 + 3000;
      break;
    case 'between_queries':
      // CRITICAL: Much longer delay between queries - 3-5 minutes
      baseDelay = Math.random() * 120000 + 180000; // 3-5 minutes
      break;
    default:
      baseDelay = baseDelay * (0.5 + Math.random());
  }
  
  if (process.env.DEBUG === 'true') {
    logger.debug(`Human-like delay: ${Math.round(baseDelay)}ms (context: ${context})`);
  }
  await sleep(baseDelay);
}

/**
 * Search DuckDuckGo with session persistence (like staying on same page)
 * REDUCED MAX_RETRIES to 2
 * @param {string} query - Search query
 * @param {string} region - Region code (e.g., 'us-en')
 * @param {number} maxPages - Maximum pages to load
 * @returns {Promise<object[]>} All results from all pages
 */
export async function searchDuckDuckGo(query, region = 'wt-wt', maxPages = 10) {
  logger.info(`Starting DuckDuckGo search session`, { query, region, maxPages });
  
  // Initial cooldown - 60-90 seconds
  const initialDelay = Math.random() * 30000 + 60000;
  logger.info(`🔍 Starting search - waiting ${Math.round(initialDelay / 1000)}s to space out requests`);
  await sleep(initialDelay);
  
  const allResults = [];
  const userAgent = getRotatingUserAgent();
  const axiosInstance = axios.create({
    timeout: 30000,
    maxRedirects: 5,
  });

  let lastError = null;
  let previousUrl = 'https://duckduckgo.com/';
  let emptyPageRetries = 0;
  const MAX_EMPTY_PAGE_RETRIES = 2;
  const MAX_RETRIES = 2; // Reduced from 3

  for (let page = 0; page < maxPages; page++) {
    const offset = page * 30;
    
    try {
      if (page > 0) {
        logger.info(`Scrolling to load more results (page ${page + 1})...`);
        await humanLikeDelay('scroll');
      } else {
        logger.info(`Loading initial search results...`);
        await sleep(Math.random() * 1000 + 1000);
      }

      const params = new URLSearchParams({
        q: query,
        s: offset.toString(),
        o: 'json',
        api: '/d.js',
        kl: region,
        dc: (offset + 1).toString(),
      });

      const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
      
      if (process.env.DEBUG === 'true') {
        logger.debug('Requesting page', { page: page + 1, offset, url: url.substring(0, 100) + '...' });
      }

      const requestHeaders = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': page === 0 ? 'none' : 'same-origin',
        'Sec-Fetch-User': page === 0 ? '?1' : undefined,
        'Referer': page > 0 ? previousUrl : undefined,
        'Cache-Control': 'max-age=0',
      };

      let response;
      let retrySuccess = false;
      let pageRetries = 0;
      
      // Modified retry logic with reduced attempts and IP block detection
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = getBackoffDelay(attempt);
            logger.warn(`Retry attempt ${attempt + 1}/${MAX_RETRIES}`, { 
              page: page + 1,
              delay: Math.round(delay) + 'ms',
              consecutiveTimeouts: consecutiveTimeouts
            });
            await sleep(delay);
          }

          response = await axiosInstance.get(url, { headers: requestHeaders });
          
          // Success - reset timeout counter
          consecutiveTimeouts = 0;
          
          // Check if response looks valid or is rate limited
          if (response.status === 202 || !response.data || response.data.length < 15000) {
            logger.warn(`Possible rate limit detected`, { 
              status: response.status,
              contentLength: response.data?.length,
              page: page + 1 
            });
            
            if (pageRetries < MAX_EMPTY_PAGE_RETRIES) {
              pageRetries++;
              // Longer wait on rate limit - 60-90 seconds
              const rateLimitDelay = Math.random() * 30000 + 60000;
              logger.info(`Waiting ${Math.round(rateLimitDelay / 1000)}s before retry due to possible rate limit`);
              await sleep(rateLimitDelay);
              continue;
            }
          }
          
          retrySuccess = true;
          break;
        } catch (error) {
          lastError = error;
          
          // Track ETIMEDOUT errors specifically for IP block detection
          if (error.code === 'ETIMEDOUT') {
            consecutiveTimeouts++;
            
            logger.warn(`Connection timeout (${consecutiveTimeouts} consecutive)`, { 
              errorCode: error.code,
              address: error.address,
              page: page + 1,
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES
            });
            
            // Check if we've hit the threshold for IP block warning
            if (consecutiveTimeouts >= TIMEOUT_THRESHOLD) {
              logger.ipBlock('Repeated connection timeouts detected - Your IP may be blocked', {
                consecutiveTimeouts: consecutiveTimeouts,
                query: query,
                region: region,
                recommendation: [
                  '1. Your IP address is likely temporarily blocked due to frequent requests',
                  '2. Wait 30-60 minutes before retrying',
                  '3. Consider using a VPN or proxy service',
                  '4. Increase delays between requests (currently using 3-5 min between queries)',
                  '5. Reduce maxPages per query to minimize request frequency'
                ],
                technicalDetails: {
                  errorCode: error.code,
                  targetAddress: error.address || 'unknown',
                  currentQuery: query,
                  pageAttempted: page + 1
                }
              });
            }
          }
          
          if (error.code === 'ECONNRESET' || 
              error.code === 'ETIMEDOUT' || 
              error.code === 'ECONNABORTED' ||
              error.code === 'ENOTFOUND' ||
              error.code === 'EAI_AGAIN' ||
              error.response?.status === 429 ||
              error.response?.status === 503 ||
              error.response?.status === 522 ||
              error.response?.status >= 500) {
            
            // Additional specific warning for explicit rate limit responses
            if (error.response?.status === 429) {
              logger.ipBlock('HTTP 429 Too Many Requests - Rate limit exceeded', {
                status: error.response.status,
                query: query,
                page: page + 1,
                recommendation: [
                  'DuckDuckGo has explicitly rate-limited your requests',
                  'Wait at least 1 hour before resuming',
                  'Consider switching to a different IP address',
                  'Reduce request frequency significantly'
                ]
              });
            }
            
            logger.warn('Transient error, will retry', { 
              errorType: error.code || `HTTP ${error.response?.status}`,
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES
            });
            continue;
          }
          
          throw error;
        }
      }

      if (!retrySuccess) {
        logger.error(`Failed to load page ${page + 1} after ${MAX_RETRIES} attempts`, {
          lastError: lastError?.message,
          consecutiveTimeouts: consecutiveTimeouts
        });
        
        // Additional warning if multiple pages failed
        if (page === 0) {
          logger.ipBlock('Failed on first page - Strong indicator of IP block', {
            query: query,
            recommendation: [
              'Unable to load even the first page of results',
              'This strongly suggests your IP is blocked',
              'Stop the script and wait 30-60 minutes',
              'Consider using a VPN or different network'
            ]
          });
        }
        
        break;
      }

      logger.success('Page loaded successfully', { 
        page: page + 1,
        statusCode: response.status,
        contentLength: response.data?.length 
      });

      previousUrl = url;
      const html = response.data;
      const results = parseDuckDuckGoResults(html);
      
      if (results.length > 0) {
        allResults.push(...results);
        logger.success(`Found ${results.length} results on page ${page + 1} (total: ${allResults.length})`);
        emptyPageRetries = 0; // Reset empty page counter
        await humanLikeDelay('reading');
      } else {
        emptyPageRetries++;
        logger.warn(`No results found on page ${page + 1}, retry ${emptyPageRetries}/${MAX_EMPTY_PAGE_RETRIES}`);
        
        if (emptyPageRetries >= MAX_EMPTY_PAGE_RETRIES) {
          logger.warn(`Stopping after ${MAX_EMPTY_PAGE_RETRIES} consecutive empty pages`);
          break;
        }
        
        // Try the same page again with different parameters
        page--; // Stay on same page index
        continue;
      }

      if (page + 1 >= maxPages) {
        logger.info(`Reached maximum pages (${maxPages})`);
        break;
      }

    } catch (error) {
      logger.error(`Error on page ${page + 1}`, {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        consecutiveTimeouts: consecutiveTimeouts
      });
      break;
    }
  }

  logger.success(`Search session completed: ${allResults.length} total results`, { query });
  
  // Final warning if we had timeout issues
  if (consecutiveTimeouts >= TIMEOUT_THRESHOLD) {
    logger.warn(`Search completed with ${consecutiveTimeouts} consecutive timeouts - Consider pausing scraping activity`, {
      totalResults: allResults.length,
      recommendation: 'Wait 30-60 minutes before starting next batch of queries'
    });
  }
  
  return allResults;
}

/**
 * Execute multiple searches sequentially with human-like delays between queries
 * INCREASED delays to 3-5 minutes between queries
 * @param {Array<{query: string, region?: string, maxPages?: number}>} searchConfigs 
 * @returns {Promise<Array<{query: string, success: boolean, results: Array, count: number, error?: string}>>}
 */
export async function executeMultipleSearches(searchConfigs) {
  const results = [];
  
  logger.info(`🚀 Executing ${searchConfigs.length} searches sequentially with human-like delays`);
  
  for (let i = 0; i < searchConfigs.length; i++) {
    const { query, region = 'wt-wt', maxPages = 10 } = searchConfigs[i];
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 Starting search ${i + 1}/${searchConfigs.length}`, { query });
    logger.info(`${'='.repeat(80)}\n`);
    
    // Check if we should pause due to IP block indicators
    if (consecutiveTimeouts >= TIMEOUT_THRESHOLD) {
      logger.ipBlock('Pausing search execution due to repeated timeouts', {
        consecutiveTimeouts: consecutiveTimeouts,
        searchesCompleted: i,
        searchesRemaining: searchConfigs.length - i,
        action: 'Waiting 10 minutes before continuing',
        recommendation: 'Consider stopping the script entirely and waiting 30-60 minutes'
      });
      
      // Wait 10 minutes before attempting next search
      const pauseDelay = 10 * 60 * 1000; // 10 minutes
      logger.info(`⏸️  Pausing for ${pauseDelay / 1000}s (10 minutes) to allow IP cooldown...`);
      await sleep(pauseDelay);
      
      // Reset counter to give it another try
      consecutiveTimeouts = 0;
    }
    
    try {
      const searchResults = await searchDuckDuckGo(query, region, maxPages);
      
      results.push({
        query,
        success: true,
        results: searchResults,
        count: searchResults.length,
        timestamp: new Date().toISOString()
      });
      
      logger.success(`✨ Search ${i + 1} completed successfully`, { 
        query, 
        resultsFound: searchResults.length 
      });
      
      // Critical: Wait between different queries (3-5 minutes)
      if (i < searchConfigs.length - 1) {
        const delayMs = Math.random() * 120000 + 180000; // 3-5 minutes
        const delaySeconds = Math.round(delayMs / 1000);
        logger.info(`⏳ Waiting ${delaySeconds}s before next query to avoid rate limits...`);
        await humanLikeDelay('between_queries');
      }
      
    } catch (error) {
      logger.error(`❌ Search ${i + 1} failed`, { query, error: error.message });
      results.push({
        query,
        success: false,
        error: error.message,
        results: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
      
      // Still wait before next query even on error (shorter delay - 1-2 minutes)
      if (i < searchConfigs.length - 1) {
        const errorDelayMs = Math.random() * 60000 + 60000; // 1-2 minutes
        logger.info(`⏳ Waiting ${Math.round(errorDelayMs / 1000)}s before next query despite error...`);
        await sleep(errorDelayMs);
      }
    }
  }
  
  // Summary
  logger.info(`\n${'='.repeat(80)}`);
  logger.success(`🎉 All searches completed!`);
  logger.info(`${'='.repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  const totalResults = results.reduce((sum, r) => sum + r.count, 0);
  
  logger.info(`📈 Summary: ${successCount}/${searchConfigs.length} searches successful, ${totalResults} total results found`);
  
  results.forEach((result, idx) => {
    const status = result.success ? '✅' : '❌';
    logger.info(`  ${status} Query ${idx + 1}: ${result.count} results - "${result.query}"`);
  });
  
  logger.info(`${'='.repeat(80)}\n`);
  
  // Final IP block assessment
  if (consecutiveTimeouts >= TIMEOUT_THRESHOLD) {
    logger.ipBlock('CRITICAL: IP block detected during batch execution', {
      consecutiveTimeouts: consecutiveTimeouts,
      successfulSearches: successCount,
      totalSearches: searchConfigs.length,
      urgentAction: [
        'STOP all scraping activity immediately',
        'Your IP is likely blocked by DuckDuckGo',
        'Wait at least 1 hour before any retry attempts',
        'Consider using a VPN or proxy for future scraping',
        'Reduce scraping frequency significantly'
      ]
    });
  }
  
  return results;
}

/**
 * Parse DuckDuckGo HTML results
 * @param {string} html 
 * @returns {object[]}
 */
function parseDuckDuckGoResults(html) {
  const results = [];
  
  try {
    if (process.env.DEBUG === 'true') {
      logger.debug('Parsing DuckDuckGo HTML results');
    }
    
    const root = parse(html);
    const resultElements = root.querySelectorAll('.result');

    if (process.env.DEBUG === 'true') {
      logger.debug(`Found ${resultElements.length} result elements`);
    }

    for (const element of resultElements) {
      try {
        const linkElement = element.querySelector('.result__a');
        if (!linkElement) continue;

        const href = linkElement.getAttribute('href');
        if (!href) continue;

        const url = extractUrlFromDDG(href);
        if (!url) continue;

        const title = linkElement.textContent?.trim() || '';
        const snippetElement = element.querySelector('.result__snippet');
        const snippet = snippetElement?.textContent?.trim() || '';
        const displayUrlElement = element.querySelector('.result__url');
        const displayUrl = displayUrlElement?.textContent?.trim() || '';

        results.push({
          url,
          title,
          snippet,
          displayUrl,
        });

        if (process.env.DEBUG === 'true') {
          logger.debug('Parsed result', { 
            url: url.substring(0, 60) + '...',
            title: title.substring(0, 50) + '...' 
          });
        }
      } catch (e) {
        logger.warn('Error parsing individual result', { error: e.message });
      }
    }
    
    logger.success(`Successfully parsed ${results.length} results`);
  } catch (e) {
    logger.error('Error parsing DuckDuckGo results', { error: e.message });
  }

  return results;
}

/**
 * Extract actual URL from DuckDuckGo redirect URL
 * @param {string} ddgUrl 
 * @returns {string|null}
 */
function extractUrlFromDDG(ddgUrl) {
  try {
    if (ddgUrl.startsWith('http://') || ddgUrl.startsWith('https://')) {
      if (ddgUrl.includes('duckduckgo.com/l/')) {
        const params = new URLSearchParams(ddgUrl.split('?')[1]);
        const uddg = params.get('uddg');
        if (uddg) {
          return decodeURIComponent(uddg);
        }
      }
      return ddgUrl;
    }

    if (ddgUrl.includes('uddg=')) {
      const params = new URLSearchParams(ddgUrl.split('?')[1]);
      const uddg = params.get('uddg');
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch page content for email extraction
 * REDUCED MAX_RETRIES to 2
 * @param {string} url 
 * @returns {Promise<string|null>}
 */
export async function fetchPageContent(url) {
  logger.info(`Fetching page content`, { url: url.substring(0, 80) + '...' });
  
  let lastError = null;
  const MAX_RETRIES = 2; // Reduced from 3
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${MAX_RETRIES} for fetch`, { 
          url: url.substring(0, 60) + '...',
          delay: Math.round(delay) + 'ms' 
        });
        await sleep(delay);
      }

      if (process.env.DEBUG === 'true') {
        logger.debug('Sending fetch request', { url });
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': getRotatingUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        timeout: 20000,
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024, // 5MB max
      });

      logger.success('Fetch successful', { 
        url: url.substring(0, 60) + '...',
        statusCode: response.status,
        contentLength: response.data?.length,
        contentType: response.headers['content-type']
      });

      // Human-like delay after fetching (3-5 seconds to "read" the page)
      await humanLikeDelay('fetch');

      return response.data;
    } catch (error) {
      lastError = error;
      
      logger.error(`Fetch attempt ${attempt + 1} failed`, {
        url: url.substring(0, 60) + '...',
        error: error.message,
        code: error.code,
        status: error.response?.status
      });
      
      if (error.code === 'ECONNRESET' || 
          error.code === 'ETIMEDOUT' || 
          error.code === 'ECONNABORTED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EAI_AGAIN' ||
          error.response?.status === 429 ||
          error.response?.status === 503 ||
          error.response?.status === 522 ||
          error.response?.status >= 500) {
        logger.warn('Transient error, will retry', { 
          errorType: error.code || `HTTP ${error.response?.status}` 
        });
        continue;
      }
      
      // Non-retryable error (404, 403, etc.)
      logger.warn('Non-retryable error, skipping URL', { 
        url: url.substring(0, 60) + '...',
        status: error.response?.status,
        error: error.message 
      });
      return null;
    }
  }

  logger.error(`Failed to fetch after ${MAX_RETRIES} attempts`, { 
    url: url.substring(0, 60) + '...',
    lastError: lastError?.message 
  });
  return null;
}

/**
 * Build search query
 * @param {string} keyword - Opportunity keyword (e.g., "write for us")
 * @param {string} niche - Niche keyword (e.g., "fashion")
 * @param {string} [tld] - Country TLD filter (e.g., ".ca")
 * @param {string} [countryName] - Country name (e.g., "Canada")
 * @returns {string}
 */
export function buildSearchQuery(keyword, niche, tld = null, countryName = null) {
  // Format: niche + keyword + country (e.g., "fashion write for us Canada")
  let query = `${niche} ${keyword}`;
  
  if (countryName) {
    query += ` ${countryName}`;
  }
///////////////////////  
/*
  if (tld) {
    query += ` site:*${tld}`;
  }
///////////*/    
/////////////////////////////  
  if (process.env.DEBUG === 'true') {
    logger.debug('Built search query', { query, keyword, niche, tld, countryName });
  }
  
  return query;
}