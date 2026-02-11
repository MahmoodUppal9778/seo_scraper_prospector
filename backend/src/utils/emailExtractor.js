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
  /^webmaster@/i,
  /^postmaster@/i,
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^do-not-reply@/i,
  /^mailer-daemon@/i,
  /^abuse@/i,
  /^spam@/i,
  /^hostmaster@/i,
  /^usenet@/i,
  /^news@/i,
  /^support@.*\.(hostinger|godaddy|bluehost|siteground|namecheap)/i,
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

  // 1. Extract from mailto: links (most reliable source)
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = normalizeEmail(match[1]);
    if (email && isValidEmail(email)) {
      emails.add(email);
    }
  }

  // 2. Extract from href attributes (handles cases where mailto might be embedded differently)
  const hrefRegex = /href=["']mailto:([^"']+)["']/gi;
  while ((match = hrefRegex.exec(html)) !== null) {
    const emailPart = match[1].split('?')[0]; // Remove query parameters
    const email = normalizeEmail(emailPart);
    if (email && isValidEmail(email)) {
      emails.add(email);
    }
  }

  // 3. Extract from data attributes and other HTML attributes
  const dataAttrRegex = /(?:data-email|data-mail|email)=["']([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']/gi;
  while ((match = dataAttrRegex.exec(html)) !== null) {
    const email = normalizeEmail(match[1]);
    if (email && isValidEmail(email)) {
      emails.add(email);
    }
  }

  // 4. Strip HTML tags for cleaner text extraction
  const strippedText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' '); // Remove HTML entities

  // 5. Extract from visible text patterns with context awareness
  const lines = strippedText.split(/[\n\r]+/);
  for (const line of lines) {
    // Look for emails in lines that contain common email-related keywords
    const lowerLine = line.toLowerCase();
    const hasEmailContext = /email|contact|reach|write|submit|send|mail|@/i.test(line);
    
    if (hasEmailContext || line.includes('@')) {
      const textEmails = line.match(emailRegex) || [];
      for (const email of textEmails) {
        const normalized = normalizeEmail(email);
        if (normalized && isValidEmail(normalized)) {
          emails.add(normalized);
        }
      }
    }
  }

  // 6. Final pass: extract ALL emails from original HTML (catches edge cases)
  const allMatches = html.match(emailRegex) || [];
  for (const email of allMatches) {
    const normalized = normalizeEmail(email);
    if (normalized && isValidEmail(normalized)) {
      emails.add(normalized);
    }
  }

  // 7. Look for obfuscated emails with common patterns
  const obfuscatedPatterns = [
    /([a-zA-Z0-9._%+-]+)\s*\[at\]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+)\s*\(at\)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\[dot\]\s*([a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\(dot\)\s*([a-zA-Z]{2,})/gi,
  ];

  for (const pattern of obfuscatedPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      let email;
      if (match.length === 3) {
        email = `${match[1]}@${match[2]}`;
      } else if (match.length === 4) {
        email = `${match[1]}@${match[2]}.${match[3]}`;
      }
      if (email) {
        const normalized = normalizeEmail(email);
        if (normalized && isValidEmail(normalized)) {
          emails.add(normalized);
        }
      }
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
    .replace(/\s*at\s*/gi, '@')
    .replace(/\[dot\]/gi, '.')
    .replace(/\(dot\)/gi, '.')
    .replace(/\s*dot\s*/gi, '.');

  // Remove trailing punctuation
  normalized = normalized.replace(/[.,;:!?]+$/, '');
  
  // Remove leading punctuation
  normalized = normalized.replace(/^[.,;:!?]+/, '');

  // Remove any remaining whitespace
  normalized = normalized.replace(/\s/g, '');

  // Handle URL encoding
  try {
    normalized = decodeURIComponent(normalized);
  } catch (e) {
    // If decoding fails, continue with the current value
  }

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

  // Local part should not start or end with a dot
  if (local.startsWith('.') || local.endsWith('.')) return false;

  // Domain should not start or end with a dot or hyphen
  if (domain.startsWith('.') || domain.endsWith('.') || 
      domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }

  // Check for valid characters in local part
  const validLocalRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!validLocalRegex.test(local)) return false;

  // Check for valid characters in domain
  const validDomainRegex = /^[a-zA-Z0-9.-]+$/;
  if (!validDomainRegex.test(domain)) return false;

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