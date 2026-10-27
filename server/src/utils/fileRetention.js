import fs from 'fs';
import path from 'path';
import Task from '../models/Task.js';
import PrintJob from '../models/PrintJob.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

/**
 * Temporary file retention cleaner
 * Deletes unlinked temporary files in `uploads/` older than maxAgeHours (default 24h).
 * Preserves all files referenced by Tasks or PrintJobs.
 */
export async function cleanTemporaryFiles(maxAgeHours = 24) {
  if (!fs.existsSync(uploadDir)) {
    return { cleanedCount: 0, freedBytes: 0, remainingCount: 0 };
  }

  // 1. Gather all referenced storage keys in MongoDB
  const referencedKeys = new Set();

  try {
    const tasks = await Task.find({}, 'attachments.storageKey').lean();
    for (const t of tasks) {
      if (t.attachments) {
        for (const att of t.attachments) {
          if (att.storageKey) referencedKeys.add(att.storageKey);
        }
      }
    }

    const printJobs = await PrintJob.find({}, 'files.storageKey').lean();
    for (const pj of printJobs) {
      if (pj.files) {
        for (const f of pj.files) {
          if (f.storageKey) referencedKeys.add(f.storageKey);
        }
      }
    }
  } catch (err) {
    console.error('Failed to query database for referenced keys in cleanup:', err.message);
  }

  // 2. Scan upload directory
  const files = fs.readdirSync(uploadDir);
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

  let cleanedCount = 0;
  let freedBytes = 0;
  let remainingCount = 0;

  for (const filename of files) {
    const filePath = path.join(uploadDir, filename);

    try {
      const stats = fs.statSync(filePath);

      // Skip directories or git files
      if (!stats.isFile() || filename.startsWith('.')) continue;

      // If file is referenced in database, keep it
      if (referencedKeys.has(filename)) {
        remainingCount++;
        continue;
      }

      // If unreferenced and older than cutoffTime, safe to delete
      if (stats.mtimeMs < cutoffTime) {
        freedBytes += stats.size;
        fs.unlinkSync(filePath);
        cleanedCount++;
      } else {
        remainingCount++;
      }
    } catch (fileErr) {
      console.warn(`Could not check or delete file ${filename}:`, fileErr.message);
    }
  }

  return { cleanedCount, freedBytes, remainingCount };
}

/**
 * Start periodic cleanup schedule (runs once every 12 hours)
 */
export function startRetentionSchedule(intervalHours = 12, maxAgeHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const result = await cleanTemporaryFiles(maxAgeHours);
      if (result.cleanedCount > 0) {
        console.log(`[Retention] Cleaned ${result.cleanedCount} temporary files (${Math.round(result.freedBytes / 1024)} KB freed)`);
      }
    } catch (err) {
      console.error('[Retention] Periodic cleanup error:', err.message);
    }
  }, intervalMs);
}
