import { Router } from 'express';
import {
  createJobHandler,
  getJobsHandler,
  getJobByIdHandler,
  deleteJobHandler,
  getResultsHandler,
  exportResultsHandler,
  getCountriesHandler,
  getNichesHandler,
} from '../controllers/jobs.js';

const router = Router();

// Job endpoints
router.post('/jobs', createJobHandler);
router.get('/jobs', getJobsHandler);
router.get('/jobs/:id', getJobByIdHandler);
router.delete('/jobs/:id', deleteJobHandler);

// Results endpoints
router.get('/results', getResultsHandler);
router.get('/results/export', exportResultsHandler);

// Reference data endpoints
router.get('/countries', getCountriesHandler);
router.get('/niches', getNichesHandler);

export default router;
