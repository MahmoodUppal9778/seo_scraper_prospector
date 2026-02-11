import axios from 'axios';
import { parse } from 'node-html-parser';
import { config } from '../config/index.js';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

// Expanded user agent pool with more diversity
const USER_AGENTS = [
  // Windows Chrome (various versions)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  // Mac Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Windows Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  // Mac Firefox
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// Browser fingerprint simulation
const BROWSER_PROFILES = {
  chrome: {
    secChUa: '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    secChUaMobile: '?0',
    secChUaPlatform: '"Windows"',
  },
  firefox: {
    // Firefox doesn't send sec-ch-ua headers
  },
  safari: {
    // Safari doesn't send sec-ch-ua headers
  },
  edge: {
    secChUa: '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    secChUaMobile: '?0',
    secChUaPlatform: '"Windows"',
  }
};

// Session state to maintain consistency
let sessionState = {
  userAgent: null,
  browserProfile: null,
  sessionId: null,
  requestCount: 0,
  lastRequestTime: 0,
  cookieJar: {},
};

// Enhanced logger
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
};

/**
 * Initialize session with consistent browser fingerprint
 */
function initializeSession() {
  const browserTypes = ['chrome', 'chrome', 'chrome', 'firefox', 'edge', 'safari']; // Weighted toward Chrome
  const selectedBrowser = browserTypes[Math.floor(Math.random() * browserTypes.length)];
  
  // Select matching user agent
  let userAgent;
  if (selectedBrowser === 'chrome') {
    const chromeAgents = USER_AGENTS.filter(ua => ua.includes('Chrome') && !ua.includes('Edg'));
    userAgent = chromeAgents[Math.floor(Math.random() * chromeAgents.length)];
  } else if (selectedBrowser === 'firefox') {
    const firefoxAgents = USER_AGENTS.filter(ua => ua.includes('Firefox'));
    userAgent = firefoxAgents[Math.floor(Math.random() * firefoxAgents.length)];
  } else if (selectedBrowser === 'safari') {
    const safariAgents = USER_AGENTS.filter(ua => ua.includes('Safari') && !ua.includes('Chrome'));
    userAgent = safariAgents[Math.floor(Math.random() * safariAgents.length)];
  } else if (selectedBrowser === 'edge') {
    const edgeAgents = USER_AGENTS.filter(ua => ua.includes('Edg'));
    userAgent = edgeAgents[Math.floor(Math.random() * edgeAgents.length)];
  }
  
  sessionState = {
    userAgent,
    browserProfile: BROWSER_PROFILES[selectedBrowser],
    sessionId: crypto.randomBytes(16).toString('hex'),
    requestCount: 0,
    lastRequestTime: 0,
    cookieJar: {},
  };
  
  logger.info('Session initialized', {
    browser: selectedBrowser,
    userAgent: userAgent.substring(0, 60) + '...',
    sessionId: sessionState.sessionId.substring(0, 8) + '...'
  });
}

/**
 * Sleep with realistic human variation
 */
function sleep(ms) {
  // More realistic variation: ±30% with occasional longer pauses
  const shouldPauseLonger = Math.random() < 0.15; // 15% chance
  
  if (shouldPauseLonger) {
    // Occasional distraction: 2-4x longer
    const multiplier = 2 + Math.random() * 2;
    ms = ms * multiplier;
    logger.debug(`Extended pause (simulating distraction): ${Math.round(ms)}ms`);
  }
  
  const jitter = ms * 0.3 * (Math.random() * 2 - 1);
  const actualDelay = Math.max(ms + jitter, ms * 0.6);
  
  if (process.env.DEBUG === 'true') {
    logger.debug(`Sleeping for ${Math.round(actualDelay)}ms`);
  }
  
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

/**
 * Exponential backoff with realistic variation
 */
function getBackoffDelay(attempt) {
  const baseDelay = 90000; // 1.5 minutes base
  const maxDelay = 600000; // 10 minutes max
  
  // Add exponential component with randomness
  const exponentialDelay = baseDelay * Math.pow(1.8, attempt);
  const delay = Math.min(exponentialDelay, maxDelay);
  
  // Add significant jitter (±40%)
  const jitter = delay * 0.4 * (Math.random() * 2 - 1);
  
  return Math.max(delay + jitter, baseDelay);
}

/**
 * Realistic human-like delays with multiple patterns
 */
async function humanLikeDelay(context = 'default', pageNumber = 0) {
  let baseDelay = config.requestDelayMs || 1000;
  
  switch (context) {
    case 'initial':
      // First page load: humans take time to scan results
      baseDelay = 4000 + Math.random() * 4000; // 4-8 seconds
      break;
      
    case 'scroll':
      // Scrolling varies significantly
      // First few pages: faster (eager)
      // Later pages: slower (more careful evaluation)
      if (pageNumber < 3) {
        baseDelay = 6000 + Math.random() * 4000; // 6-10 seconds
      } else if (pageNumber < 7) {
        baseDelay = 8000 + Math.random() * 7000; // 8-15 seconds
      } else {
        baseDelay = 12000 + Math.random() * 10000; // 12-22 seconds (more careful on later pages)
      }
      
      // Occasionally take longer (reading a result title/snippet)
      if (Math.random() < 0.3) {
        baseDelay *= 1.5;
        logger.debug('Extended scroll delay (reading result)');
      }
      break;
      
    case 'reading':
      // Reading time varies by page number (fatigue factor)
      if (pageNumber < 5) {
        baseDelay = 3000 + Math.random() * 3000; // 3-6 seconds
      } else {
        baseDelay = 4000 + Math.random() * 5000; // 4-9 seconds (slower as tired)
      }
      break;
      
    case 'fetch':
      baseDelay = 3000 + Math.random() * 3000; // 3-6 seconds
      break;
      
    case 'between_queries':
      // Extended delay between different searches: 4-7 minutes
      baseDelay = 240000 + Math.random() * 180000;
      break;
      
    case 'micro_pause':
      // Tiny pauses (typing, mouse movement simulation)
      baseDelay = 100 + Math.random() * 300; // 100-400ms
      break;
      
    default:
      baseDelay = baseDelay * (0.7 + Math.random() * 0.6);
  }
  
  if (process.env.DEBUG === 'true') {
    logger.debug(`Human-like delay: ${Math.round(baseDelay)}ms (context: ${context}, page: ${pageNumber})`);
  }
  
  await sleep(baseDelay);
}

/**
 * Generate realistic browser headers
 */
function generateHeaders(page = 0, previousUrl = null) {
  const headers = {
    'User-Agent': sessionState.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': page === 0 ? 'none' : 'same-origin',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
  };
  
  // Add browser-specific headers
  if (sessionState.browserProfile.secChUa) {
    headers['sec-ch-ua'] = sessionState.browserProfile.secChUa;
    headers['sec-ch-ua-mobile'] = sessionState.browserProfile.secChUaMobile;
    headers['sec-ch-ua-platform'] = sessionState.browserProfile.secChUaPlatform;
  }
  
  // Add Sec-Fetch-User only on first page
  if (page === 0) {
    headers['Sec-Fetch-User'] = '?1';
  }
  
  // Add referer for subsequent pages
  if (page > 0 && previousUrl) {
    headers['Referer'] = previousUrl;
  }
  
  // Simulate cookies
  if (Object.keys(sessionState.cookieJar).length > 0) {
    headers['Cookie'] = Object.entries(sessionState.cookieJar)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }
  
  return headers;
}

/**
 * Update cookies from response
 */
function updateCookies(response) {
  const setCookieHeaders = response.headers['set-cookie'];
  if (setCookieHeaders) {
    setCookieHeaders.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        sessionState.cookieJar[name.trim()] = value.trim();
      }
    });
  }
}

/**
 * Detect rate limiting indicators
 */
function isRateLimited(response, html) {
  // Multiple indicators of rate limiting
  const indicators = [
    response.status === 202,
    response.status === 429,
    response.status === 503,
    html && html.length < 15000,
    html && html.includes('slow down'),
    html && html.includes('rate limit'),
    html && html.includes('captcha'),
    html && html.includes('automated'),
  ];
  
  const detectedCount = indicators.filter(Boolean).length;
  return detectedCount >= 2; // At least 2 indicators
}

/**
 * Enhanced search with better anti-detection
 */
export async function searchDuckDuckGo(query, region = 'wt-wt', maxPages = 15) {
  // Initialize session for this search
  initializeSession();
  
  logger.info(`Starting DuckDuckGo search with enhanced stealth`, { query, region, maxPages });
  
  // Initial realistic delay: 30-60 seconds (human opening browser, typing query)
  const initialDelay = 30000 + Math.random() * 30000;
  logger.info(`🔍 Simulating human behavior - waiting ${Math.round(initialDelay / 1000)}s (opening browser, typing query)`);
  await sleep(initialDelay);
  
  const allResults = [];
  
  // Create axios instance with connection pooling for better performance
  const axiosInstance = axios.create({
    timeout: 35000,
    maxRedirects: 5,
    validateStatus: (status) => status < 500, // Don't throw on 4xx
    // Enable keep-alive for connection reuse
    httpAgent: new http.Agent({ 
      keepAlive: true, 
      keepAliveMsecs: 30000,
      maxSockets: 1,
      maxFreeSockets: 1
    }),
    httpsAgent: new https.Agent({ 
      keepAlive: true, 
      keepAliveMsecs: 30000,
      maxSockets: 1,
      maxFreeSockets: 1
    }),
  });

  let previousUrl = 'https://duckduckgo.com/';
  let consecutiveEmptyPages = 0;
  let consecutiveRateLimits = 0;
  const MAX_CONSECUTIVE_RATE_LIMITS = 2;
  const MAX_RETRIES_PER_PAGE = 3;
  
  let page = 0; // Declare page variable outside loop
  for (page = 0; page < maxPages; page++) {
    const offset = page * 30;
    
    try {
      // Progressive delay increase based on page number
      if (page > 0) {
        logger.info(`Scrolling to page ${page + 1}...`);
        await humanLikeDelay('scroll', page);
      } else {
        logger.info(`Loading initial search results...`);
        await humanLikeDelay('initial', page);
      }
      
      // Micro-pause before request (simulating mouse movement)
      await humanLikeDelay('micro_pause');

      const params = new URLSearchParams({
        q: query,
        s: offset.toString(),
        o: 'json',
        api: '/d.js',
        kl: region,
        dc: (offset + 1).toString(),
      });

      const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
      const requestHeaders = generateHeaders(page, previousUrl);
      
      if (process.env.DEBUG === 'true') {
        logger.debug('Request details', { 
          page: page + 1, 
          offset,
          headers: Object.keys(requestHeaders)
        });
      }

      let response;
      let retrySuccess = false;
      
      for (let attempt = 0; attempt < MAX_RETRIES_PER_PAGE; attempt++) {
        try {
          if (attempt > 0) {
            const delay = getBackoffDelay(attempt);
            logger.warn(`Retry attempt ${attempt + 1}/${MAX_RETRIES_PER_PAGE}`, { 
              page: page + 1,
              delaySeconds: Math.round(delay / 1000)
            });
            await sleep(delay);
          }

          // Track request timing
          sessionState.lastRequestTime = Date.now();
          sessionState.requestCount++;

          response = await axiosInstance.get(url, { headers: requestHeaders });
          
          // Update cookies from response
          updateCookies(response);
          
          // Check for rate limiting
          if (isRateLimited(response, response.data)) {
            consecutiveRateLimits++;
            
            logger.warn(`Rate limit detected (${consecutiveRateLimits} consecutive)`, { 
              status: response.status,
              contentLength: response.data?.length,
              page: page + 1 
            });
            
            if (consecutiveRateLimits >= MAX_CONSECUTIVE_RATE_LIMITS) {
              logger.error('Multiple consecutive rate limits detected - pausing');
              
              // Long pause: 5-8 minutes
              const pauseDelay = 300000 + Math.random() * 180000;
              logger.info(`⏸️  Taking extended break: ${Math.round(pauseDelay / 1000)}s (5-8 min) - simulating human giving up and doing something else`);
              await sleep(pauseDelay);
              
              // Reset session after long pause
              logger.info('Creating new session after extended break');
              initializeSession();
              consecutiveRateLimits = 0;
              
              // Retry this page with new session
              continue;
            }
            
            // Shorter pause for first rate limit: 90-150 seconds
            const rateLimitDelay = 90000 + Math.random() * 60000;
            logger.info(`Waiting ${Math.round(rateLimitDelay / 1000)}s before retry`);
            await sleep(rateLimitDelay);
            continue;
          }
          
          // Success - reset rate limit counter
          consecutiveRateLimits = 0;
          retrySuccess = true;
          break;
          
        } catch (error) {
          logger.error(`Request error on attempt ${attempt + 1}`, {
            error: error.message,
            code: error.code,
            status: error.response?.status
          });
          
          // Network errors - retry with backoff
          if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || 
              error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
            
            if (attempt < MAX_RETRIES_PER_PAGE - 1) {
              const delay = getBackoffDelay(attempt);
              logger.info(`Network error - waiting ${Math.round(delay / 1000)}s before retry`);
              await sleep(delay);
              continue;
            }
          }
          
          throw error;
        }
      }

      if (!retrySuccess) {
        logger.error(`Failed to load page ${page + 1} after ${MAX_RETRIES_PER_PAGE} attempts`);
        break;
      }

      logger.success('Page loaded', { 
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
        consecutiveEmptyPages = 0;
        
        // Realistic reading time
        await humanLikeDelay('reading', page);
      } else {
        consecutiveEmptyPages++;
        logger.warn(`No results on page ${page + 1} (${consecutiveEmptyPages} consecutive empty)`);
        
        if (consecutiveEmptyPages >= 2) {
          logger.info('Multiple empty pages - assuming end of results');
          break;
        }
      }

    } catch (error) {
      logger.error(`Error on page ${page + 1}`, {
        error: error.message,
        code: error.code,
        status: error.response?.status
      });
      
      // Handle different error types intelligently
      const isNetworkError = ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code);
      const isRateLimitError = error.response?.status === 429 || error.response?.status === 503;
      
      // Don't immediately give up on transient errors
      if (isNetworkError || isRateLimitError) {
        logger.warn('Transient error detected - taking break before retry', {
          errorType: isNetworkError ? 'network' : 'rate_limit',
          page: page + 1
        });
        
        // Longer pause for rate limits, shorter for network issues
        const pauseMs = isRateLimitError ? (120000 + Math.random() * 60000) : (30000 + Math.random() * 30000);
        logger.info(`⏸️  Pausing ${Math.round(pauseMs / 1000)}s before retry`);
        await sleep(pauseMs);
        
        // Retry same page
        page--;
        continue;
      }
      
      // For early pages, be more persistent
      if (page < 5) {
        logger.warn('Early page error - will retry after break');
        await sleep(60000 + Math.random() * 30000); // 60-90 second break
        page--; // Retry same page
        continue;
      }
      
      // Later pages: stop on persistent errors
      break;
    }
  }

  logger.success(`Search completed: ${allResults.length} total results`, { 
    query,
    pagesScraped: Math.min(page + 1, maxPages),
    sessionRequests: sessionState.requestCount
  });
  
  return allResults;
}

/**
 * Execute multiple searches with enhanced delays
 */
export async function executeMultipleSearches(searchConfigs) {
  const results = [];
  
  logger.info(`🚀 Executing ${searchConfigs.length} searches with realistic human behavior`);
  
  for (let i = 0; i < searchConfigs.length; i++) {
    const { query, region = 'wt-wt', maxPages = 15 } = searchConfigs[i];
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 Starting search ${i + 1}/${searchConfigs.length}`, { query });
    logger.info(`${'='.repeat(80)}\n`);
    
    try {
      const searchResults = await searchDuckDuckGo(query, region, maxPages);
      
      results.push({
        query,
        success: true,
        results: searchResults,
        count: searchResults.length,
        timestamp: new Date().toISOString()
      });
      
      logger.success(`✨ Search ${i + 1} completed`, { 
        query, 
        resultsFound: searchResults.length 
      });
      
      // Long delay between queries: 4-7 minutes
      if (i < searchConfigs.length - 1) {
        const delayMs = 240000 + Math.random() * 180000;
        const delayMinutes = Math.round(delayMs / 60000);
        logger.info(`⏳ Taking break before next search: ${delayMinutes} minutes (simulating human behavior)`);
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
      
      // Even on error, wait before next query
      if (i < searchConfigs.length - 1) {
        const errorDelay = 120000 + Math.random() * 60000; // 2-3 minutes
        logger.info(`⏳ Waiting ${Math.round(errorDelay / 60000)} minutes despite error`);
        await sleep(errorDelay);
      }
    }
  }
  
  // Summary
  logger.info(`\n${'='.repeat(80)}`);
  logger.success(`🎉 All searches completed!`);
  logger.info(`${'='.repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  const totalResults = results.reduce((sum, r) => sum + r.count, 0);
  
  logger.info(`📈 Summary: ${successCount}/${searchConfigs.length} successful, ${totalResults} total results`);
  
  results.forEach((result, idx) => {
    const status = result.success ? '✅' : '❌';
    logger.info(`  ${status} Query ${idx + 1}: ${result.count} results - "${result.query}"`);
  });
  
  logger.info(`${'='.repeat(80)}\n`);
  
  return results;
}

/**
 * Parse DuckDuckGo results (unchanged)
 */
function parseDuckDuckGoResults(html) {
  const results = [];
  
  try {
    const root = parse(html);
    const resultElements = root.querySelectorAll('.result');

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
      } catch (e) {
        // Skip invalid results
      }
    }
  } catch (e) {
    logger.error('Error parsing results', { error: e.message });
  }

  return results;
}

/**
 * Extract URL from DuckDuckGo redirect (unchanged)
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
 * Fetch page content with anti-detection
 */
export async function fetchPageContent(url) {
  logger.info(`Fetching page`, { url: url.substring(0, 60) + '...' });
  
  // Simulate thinking/deciding time before clicking
  await humanLikeDelay('micro_pause');
  
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt);
        logger.warn(`Retry ${attempt + 1}/${MAX_RETRIES}`, { 
          url: url.substring(0, 50) + '...',
          delaySeconds: Math.round(delay / 1000)
        });
        await sleep(delay);
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': sessionState.userAgent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 25000,
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024,
      });

      logger.success('Fetch successful', { 
        url: url.substring(0, 50) + '...',
        statusCode: response.status
      });

      // Simulate reading time
      await humanLikeDelay('fetch');

      return response.data;
    } catch (error) {
      logger.error(`Fetch attempt ${attempt + 1} failed`, {
        url: url.substring(0, 50) + '...',
        error: error.message
      });
      
      // Non-retryable errors
      if (error.response?.status === 404 || error.response?.status === 403) {
        return null;
      }
    }
  }

  logger.error(`Failed to fetch after ${MAX_RETRIES} attempts`, { url: url.substring(0, 50) + '...' });
  return null;
}

/**
 * Build search query (unchanged)
 */
export function buildSearchQuery(keyword, niche, tld = null, countryName = null) {
  let query = `${niche} ${keyword}`;
  
  if (countryName) {
    query += ` ${countryName}`;
  }
  
  return query;
}