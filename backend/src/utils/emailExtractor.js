// Email extraction utilities

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Common patterns to exclude (false positives)
const excludePatterns = [
  /example\.com$/i,
  /test\.com$/i,
  /domain\.com$/i,
  /email\.com$/i,
  /yoursite\.com$/i,
  /yourdomain\.com$/i,
  /placeholder/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.webp$/i,
  /sentry\.io$/i,
  /wixpress\.com$/i,
  /cloudflare/i,
];

// Common prefixes that indicate real contact emails
const priorityPrefixes = [
  'contact',
  'info',
  'hello',
  'admin',
  'editor',
  'editorial',
  'guest',
  'submit',
  'contribute',
  'partnerships',
  'marketing',
  'pr',
  'media',
  'press',
  'business',
];

/**
 * Extract emails from HTML content
 * @param {string} html - Raw HTML content
 * @returns {string[]} - Array of unique, normalized emails
 */
export function extractEmails(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  const emails = new Set();

  // Extract from mailto: links
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = normalizeEmail(match[1]);
    if (email && isValidEmail(email)) {
      emails.add(email);
    }
  }

  // Extract from visible text patterns
  const textEmails = html.match(emailRegex) || [];
  for (const email of textEmails) {
    const normalized = normalizeEmail(email);
    if (normalized && isValidEmail(normalized)) {
      emails.add(normalized);
    }
  }

  // Sort by priority (contact/info emails first)
  const emailArray = Array.from(emails);
  return emailArray.sort((a, b) => {
    const aPriority = getPriority(a);
    const bPriority = getPriority(b);
    return bPriority - aPriority;
  });
}

/**
 * Normalize email address
 * @param {string} email 
 * @returns {string|null}
 */
function normalizeEmail(email) {
  if (!email) return null;
  
  // Remove common obfuscations
  let normalized = email
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/\[at\]/gi, '@')
    .replace(/\(at\)/gi, '@')
    .replace(/\[dot\]/gi, '.')
    .replace(/\(dot\)/gi, '.');

  // Remove trailing punctuation
  normalized = normalized.replace(/[.,;:!?]+$/, '');

  return normalized;
}

/**
 * Validate email address
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || email.length < 5 || email.length > 254) {
    return false;
  }

  // Check against exclude patterns
  for (const pattern of excludePatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  // Basic format validation
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64 || domain.length > 253) {
    return false;
  }

  // Domain must have at least one dot
  if (!domain.includes('.')) return false;

  // No consecutive dots
  if (email.includes('..')) return false;

  return true;
}

/**
 * Get priority score for email
 * @param {string} email 
 * @returns {number}
 */
function getPriority(email) {
  const localPart = email.split('@')[0];
  for (let i = 0; i < priorityPrefixes.length; i++) {
    if (localPart.startsWith(priorityPrefixes[i])) {
      return priorityPrefixes.length - i;
    }
  }
  return 0;
}

/**
 * Extract domain from URL
 * @param {string} url 
 * @returns {string|null}
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check if domain is blocked (social media, search engines, etc.)
 * @param {string} domain 
 * @returns {boolean}
 */
export function isBlockedDomain(domain) {
  const blockedDomains = [
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
    'pinterest.com',
    'reddit.com',
    'tumblr.com',
    'google.com',
    'bing.com',
    'yahoo.com',
    'duckduckgo.com',
    'wikipedia.org',
    'amazon.com',
    'ebay.com',
    'apple.com',
    'microsoft.com',
    'github.com',
    'medium.com',
    'quora.com',
    'wordpress.com',
    'blogger.com',
  ];

  const lowerDomain = domain.toLowerCase();
  return blockedDomains.some(blocked => 
    lowerDomain === blocked || lowerDomain.endsWith('.' + blocked)
  );
}
