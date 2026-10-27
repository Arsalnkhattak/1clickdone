import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import PrintJob from '../src/models/PrintJob.js';
import * as printJobService from '../src/modules/print-jobs/printJob.service.js';
import * as documentService from '../src/modules/documents/document.service.js';
import { cleanTemporaryFiles } from '../src/utils/fileRetention.js';

test('Scanner Backend Integration Suite', async (t) => {
  await connectDB();

  let adminUser = await User.findOne({ email: 'admin@1click.com' });
  assert.ok(adminUser, 'Admin user should exist in MongoDB');

  let testJobId = null;

  await t.test('1. Create Print Job from Scanner Module', async () => {
    const jobData = {
      serviceType: 'document_scan',
      pageCount: 2,
      paperSize: 'A4',
      colorMode: 'color',
      copies: 2,
      layoutDistribution: '1-up',
      price: 60,
      currency: 'PKR',
      notes: 'Customer requested 2 copies on 80gsm A4 paper',
      files: [
        {
          originalName: 'page1.jpg',
          storageKey: 'test-front.jpg',
          mimeType: 'image/jpeg',
          size: 112581,
        },
        {
          originalName: 'page2.jpg',
          storageKey: 'test-back.jpg',
          mimeType: 'image/jpeg',
          size: 103704,
        },
      ],
    };

    const createdJob = await printJobService.createPrintJob(jobData, adminUser._id);
    assert.ok(createdJob._id, 'Job should have MongoDB ObjectId');
    assert.match(createdJob.jobNumber, /^PJ-/, 'Job should have sequential PJ- prefix');
    assert.strictEqual(createdJob.pageCount, 2);
    assert.strictEqual(createdJob.copies, 2);
    assert.strictEqual(createdJob.price, 60);
    assert.strictEqual(createdJob.status, 'pending');

    testJobId = createdJob._id;
  });

  await t.test('2. Query Print Jobs List and by ID', async () => {
    const listResult = await printJobService.getPrintJobs({ limit: 10 });
    assert.ok(listResult.jobs.length > 0, 'Should return non-empty print jobs list');

    const job = await printJobService.getPrintJobById(testJobId);
    assert.strictEqual(job._id.toString(), testJobId.toString());
    assert.strictEqual(job.serviceType, 'document_scan');
    assert.strictEqual(job.files.length, 2);
  });

  await t.test('3. Update Print Job Status to Printed and Completed', async () => {
    const updated = await printJobService.updatePrintJobStatus(testJobId, 'completed', adminUser._id);
    assert.strictEqual(updated.status, 'completed');
    assert.ok(updated.completedAt instanceof Date, 'completedAt should be timestamped');
  });

  await t.test('4. Server-Side Scan-to-PDF Generation from Multiple Uploaded Pages', async () => {
    const pdfResult = await documentService.createPdfFromPages({
      pages: [
        { storageKey: 'test-front.jpg', rotation: 0 },
        { storageKey: 'test-back.jpg', rotation: 90 },
      ],
      pageSize: 'A4',
      orientation: 'portrait',
      margin: 20,
      outputName: 'Staff_Scanner_Integration_Test.pdf',
    });

    assert.ok(pdfResult.filename, 'Should return generated PDF filename');
    assert.strictEqual(pdfResult.mimeType, 'application/pdf');
    assert.ok(pdfResult.size > 1000, `PDF size should be > 1KB, got ${pdfResult.size}`);

    const pdfPath = path.resolve(process.cwd(), 'uploads', pdfResult.filename);
    assert.ok(fs.existsSync(pdfPath), 'Physical PDF file should exist in uploads directory');

    // Clean up temporary generated test PDF
    try {
      fs.unlinkSync(pdfPath);
    } catch {}
  });

  await t.test('5. Temporary File Retention Policy Execution', async () => {
    // Run retention cleanup for files older than 24h
    const cleanupResult = await cleanTemporaryFiles(24);
    assert.ok(typeof cleanupResult.cleanedCount === 'number');
    assert.ok(typeof cleanupResult.freedBytes === 'number');
    assert.ok(typeof cleanupResult.remainingCount === 'number');
  });

  await t.test('6. Delete Test Print Job Cleanup', async () => {
    if (testJobId) {
      const delResult = await printJobService.deletePrintJob(testJobId);
      assert.strictEqual(delResult.message, 'Print job deleted successfully');
    }
  });

  // Close MongoDB connection after tests
  const mongoose = (await import('mongoose')).default;
  await mongoose.connection.close();
});
