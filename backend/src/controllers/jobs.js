import { createJob, getJob, getAllJobs, cancelJob } from '../services/crawler.js';
import { loadResults, loadAllResults, deleteJob, deleteResults } from '../utils/persistence.js';
import { niches, countries } from '../config/index.js';

/**
 * Apply filters to results
 * @param {Array} results - Results to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered results
 */
function applyResultFilters(results, filters) {
  const { country, niche, opportunityType, hasEmail, domain } = filters;
  
  let filtered = [...results];
  
  // Apply filters
  if (country && country !== 'all') {
    filtered = filtered.filter(r => r.country === country);
  }
  if (niche) {
    filtered = filtered.filter(r => r.niche.toLowerCase().includes(niche.toLowerCase()));
  }
  if (opportunityType && opportunityType !== 'all') {
    filtered = filtered.filter(r => r.opportunityType === opportunityType);
  }
  if (hasEmail === 'true') {
    filtered = filtered.filter(r => r.hasEmail);
  }
  if (domain) {
    filtered = filtered.filter(r => r.domain.toLowerCase().includes(domain.toLowerCase()));
  }
  
  return filtered;
}

/**
 * Deduplicate results by domain
 * @param {Array} results - Results to deduplicate
 * @returns {Array} Deduplicated results
 */
function deduplicateByDomain(results) {
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.domain)) return false;
    seen.add(r.domain);
    return true;
  });
}

/**
 * Sanitize and validate input parameters
 * @param {Object} params - Input parameters
 * @returns {Object} Validated parameters
 */
function validateJobParams(params) {
  const { niches, countries, opportunityTypes, maxPages, customNiche } = params;
  
  // Validate maxPages
  const validatedMaxPages = Math.min(Math.max(parseInt(maxPages) || 5, 1), 20);
  
  // Sanitize customNiche - remove special characters that could cause issues
  let validatedCustomNiche = null;
  if (customNiche && typeof customNiche === 'string') {
    validatedCustomNiche = customNiche
      .trim()
      .replace(/[<>\"'`]/g, '') // Remove potential injection characters
      .substring(0, 100); // Limit length
  }
  
  // Validate arrays
  const validatedNiches = Array.isArray(niches) ? niches : [];
  const validatedCountries = Array.isArray(countries) ? countries : [];
  const validatedOpportunityTypes = Array.isArray(opportunityTypes) && opportunityTypes.length > 0
    ? opportunityTypes
    : ['guestPost', 'linkInsertion'];
  
  return {
    niches: validatedNiches,
    countries: validatedCountries,
    opportunityTypes: validatedOpportunityTypes,
    maxPages: validatedMaxPages,
    customNiche: validatedCustomNiche
  };
}

/**
 * Escape CSV content to prevent formula injection
 * @param {string} content - Content to escape
 * @returns {string} Escaped content
 */
function escapeCSVContent(content) {
  if (!content) return '';
  
  const str = String(content);
  
  // Check if content starts with formula characters
  if (str.match(/^[=+\-@]/)) {
    return `'${str.replace(/"/g, '""')}`;
  }
  
  return str.replace(/"/g, '""');
}

/**
 * Create a new search job
 */
export async function createJobHandler(req, res) {
  try {
    const validatedParams = validateJobParams(req.body);
    const { niches, countries, opportunityTypes, maxPages, customNiche } = validatedParams;

    if (!niches.length && !customNiche) {
      return res.status(400).json({ error: 'At least one niche or custom niche is required' });
    }

    const job = await createJob({
      niches,
      countries,
      opportunityTypes,
      maxPages,
      customNiche,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
}

/**
 * Get all jobs
 */
export async function getJobsHandler(req, res) {
  try {
    const jobs = getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Error getting jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
}

/**
 * Get job by ID
 */
export async function getJobByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
}

/**
 * Cancel/delete a job
 */
export async function deleteJobHandler(req, res) {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await cancelJob(id);
    await deleteJob(id);
    await deleteResults(id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
}

/**
 * Get results with pagination and filters
 */
export async function getResultsHandler(req, res) {
  try {
    const {
      jobId,
      page = 1,
      limit = 50,
      country,
      niche,
      opportunityType,
      hasEmail,
      domain,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 1000); // Cap at 1000

    let results;
    if (jobId) {
      results = await loadResults(jobId);
    } else {
      results = await loadAllResults();
    }

    // Apply filters using helper function
    results = applyResultFilters(results, {
      country,
      niche,
      opportunityType,
      hasEmail,
      domain
    });

    // Deduplicate by domain
    results = deduplicateByDomain(results);

    // Sort
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const order = sortOrder === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * order;
      }
      return ((aVal || 0) - (bVal || 0)) * order;
    });

    // Paginate
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      results: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: results.length,
        totalPages: Math.ceil(results.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
}

/**
 * Export results to CSV
 */
export async function exportResultsHandler(req, res) {
  try {
    const { jobId, country, niche, opportunityType, hasEmail } = req.query;

    let results;
    if (jobId) {
      results = await loadResults(jobId);
    } else {
      results = await loadAllResults();
    }

    // Apply filters using helper function
    results = applyResultFilters(results, {
      country,
      niche,
      opportunityType,
      hasEmail
    });

    // Deduplicate by domain
    results = deduplicateByDomain(results);

    // Generate CSV with formula injection protection
    const headers = ['URL', 'Domain', 'Title', 'Niche', 'Country', 'Opportunity Type', 'Emails'];
    const rows = results.map(r => [
      escapeCSVContent(r.url),
      escapeCSVContent(r.domain),
      `"${escapeCSVContent(r.title || '')}"`,
      escapeCSVContent(r.niche),
      escapeCSVContent(r.country),
      escapeCSVContent(r.opportunityType),
      escapeCSVContent(r.emails?.join('; ') || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=seo-prospects-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
}

/**
 * Get available countries
 */
export async function getCountriesHandler(req, res) {
  try {
    res.json(countries);
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({ error: 'Failed to get countries' });
  }
}

/**
 * Get available niches
 */
export async function getNichesHandler(req, res) {
  try {
    res.json(niches);
  } catch (error) {
    console.error('Error getting niches:', error);
    res.status(500).json({ error: 'Failed to get niches' });
  }
}