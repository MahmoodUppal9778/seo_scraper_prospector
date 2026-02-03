import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

const DATA_DIR = config.dataDir;

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Get file path for a job
 * @param {string} jobId 
 * @returns {string}
 */
function getJobPath(jobId) {
  return path.join(DATA_DIR, `job_${jobId}.json`);
}

/**
 * Save job state to disk
 * @param {object} job 
 */
export async function saveJob(job) {
  await ensureDataDir();
  const filePath = getJobPath(job.id);
  await fs.writeFile(filePath, JSON.stringify(job, null, 2), 'utf-8');
}

/**
 * Load job state from disk
 * @param {string} jobId 
 * @returns {object|null}
 */
export async function loadJob(jobId) {
  try {
    const filePath = getJobPath(jobId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Delete job from disk
 * @param {string} jobId 
 */
export async function deleteJob(jobId) {
  try {
    const filePath = getJobPath(jobId);
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Load all jobs from disk
 * @returns {object[]}
 */
export async function loadAllJobs() {
  await ensureDataDir();
  
  try {
    const files = await fs.readdir(DATA_DIR);
    const jobFiles = files.filter(f => f.startsWith('job_') && f.endsWith('.json'));
    
    const jobs = [];
    for (const file of jobFiles) {
      try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        jobs.push(JSON.parse(data));
      } catch {
        // Skip corrupted files
      }
    }
    
    return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Save domain cache to disk
 * @param {Map} cache 
 */
export async function saveDomainCache(cache) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, 'domain_cache.json');
  const data = Object.fromEntries(cache);
  await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

/**
 * Load domain cache from disk
 * @returns {Map}
 */
export async function loadDomainCache() {
  try {
    const filePath = path.join(DATA_DIR, 'domain_cache.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

/**
 * Get results file path
 * @param {string} jobId 
 * @returns {string}
 */
function getResultsPath(jobId) {
  return path.join(DATA_DIR, `results_${jobId}.json`);
}

/**
 * Append results to job file
 * @param {string} jobId 
 * @param {object[]} results 
 */
export async function appendResults(jobId, results) {
  await ensureDataDir();
  const filePath = getResultsPath(jobId);
  
  let existing = [];
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    existing = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }
  
  existing.push(...results);
  await fs.writeFile(filePath, JSON.stringify(existing), 'utf-8');
}

/**
 * Load results for a job
 * @param {string} jobId 
 * @returns {object[]}
 */
export async function loadResults(jobId) {
  try {
    const filePath = getResultsPath(jobId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Load all results across all jobs
 * @returns {object[]}
 */
export async function loadAllResults() {
  await ensureDataDir();
  
  try {
    const files = await fs.readdir(DATA_DIR);
    const resultFiles = files.filter(f => f.startsWith('results_') && f.endsWith('.json'));
    
    let allResults = [];
    for (const file of resultFiles) {
      try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const results = JSON.parse(data);
        allResults.push(...results);
      } catch {
        // Skip corrupted files
      }
    }
    
    return allResults;
  } catch {
    return [];
  }
}

/**
 * Delete results for a job
 * @param {string} jobId 
 */
export async function deleteResults(jobId) {
  try {
    const filePath = getResultsPath(jobId);
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
