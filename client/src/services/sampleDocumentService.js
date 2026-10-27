/**
 * Sample Document Generator Service
 * Procedurally generates realistic angled documents for instant testing:
 * 1. Angled A4 Project Proposal Sheet (Testing Auto Straighten, 8-point crop, deskew, OCR)
 * 2. Angled Pakistani CNIC ID Card (Testing CNIC preset ratio, magic filter, Urdu OCR)
 */

/**
 * Converts a Canvas to a File object.
 */
function canvasToFile(canvas, filename, mimeType = 'image/jpeg') {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });
      resolve(file);
    }, mimeType, 0.95);
  });
}

/**
 * Creates an angled A4 University Project Proposal sheet test document.
 */
export async function createSampleProposalFile() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');

  // Patterned Bed Sheet / Table Background
  ctx.fillStyle = '#1e2029';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#2d3245';
  ctx.lineWidth = 14;
  for (let i = -1000; i < 2500; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 1000, 1500);
    ctx.stroke();
  }

  // Angled A4 Document Paper Sheet (~ 7 degree tilt)
  ctx.save();
  ctx.translate(600, 750);
  ctx.rotate(-0.12);

  const docW = 760;
  const docH = 1060;
  const x = -docW / 2;
  const y = -docH / 2;

  // Paper Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 20;

  // Paper Surface
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(x, y, docW, docH);
  ctx.shadowColor = 'transparent';

  // University Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Kohat University of Science & Technology', 0, y + 80);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#2563eb';
  ctx.fillText('Institute of Computing', 0, y + 115);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Kohat, Khyber Pakhtunkhwa, Pakistan', 0, y + 140);

  // Divider Line
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 50, y + 165);
  ctx.lineTo(x + docW - 50, y + 165);
  ctx.stroke();

  // Document Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BSCS / BSSE Final Year Project Proposal (FYP)', 0, y + 210);

  // Project Info Box
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x + 50, y + 240, docW - 100, 75);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('MADADGAR: AI-Powered Home Services Platform', 0, y + 270);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Multimodal (Voice, Text & Image) Discovery & Automated Booking', 0, y + 295);

  // Student Table
  const tx = x + 50;
  const ty = y + 350;
  const tw = docW - 100;
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(tx, ty, tw, 220);

  // Table Header
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(tx, ty, tw, 36);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(' Sr. No   Registration      Name                         Class                  Email', tx + 10, ty + 23);

  const rows = [
    [' 1', ' CS120202078', ' Muhammad Arslan', ' BSCS 7th B', ' arslan@gmail.com'],
    [' 2', ' CS120202104', ' Usman Khan', ' BSCS 7th A', ' usman@gmail.com'],
    [' 3', ' CS120202097', ' Muhammad Shayan', ' BSCS 7th B', ' shayan@gmail.com'],
  ];

  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(tx, ty + 36 + idx * 46, tw, 46);
    ctx.fillStyle = '#334155';
    ctx.font = '12px sans-serif';
    ctx.fillText(r.join('     '), tx + 10, ty + 64 + idx * 46);
  });

  // Supervisor Signatures
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Supervisor Signature: _______________________', x + 50, y + 850);
  ctx.fillText('Date Submitted: September 28, 2026', x + 50, y + 900);

  ctx.restore();

  return await canvasToFile(canvas, 'Sample_Proposal_A4.jpg');
}

/**
 * Creates an angled Pakistani CNIC ID card test document.
 */
export async function createSampleCnicFile() {
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');

  // Dark desktop background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Angled Card (~ 5 degree tilt)
  ctx.save();
  ctx.translate(550, 380);
  ctx.rotate(-0.09);

  const cardW = 720;
  const cardH = 450;
  const x = -cardW / 2;
  const y = -cardH / 2;

  // Card Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;

  // Card Body
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, cardW, cardH, 20);
  } else {
    ctx.rect(x, y, cardW, cardH);
  }
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Green header strip
  ctx.fillStyle = '#047857';
  ctx.fillRect(x + 20, y + 20, cardW - 40, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ISLAMIC REPUBLIC OF PAKISTAN - NATIONAL IDENTITY CARD', 0, y + 50);

  // Photo placeholder box
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + 40, y + 90, 140, 175);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('PHOTO', x + 110, y + 180);

  // Details
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Name: Muhammad Arslan', x + 210, y + 115);
  ctx.fillText('Father Name: Abdul Qayyum', x + 210, y + 145);
  ctx.fillText('Gender: M   |   Country of Stay: Pakistan', x + 210, y + 175);

  // CNIC Identity Number
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('Identity Number: 14201-1037793-3', x + 210, y + 215);

  ctx.fillStyle = '#334155';
  ctx.font = '14px sans-serif';
  ctx.fillText('Date of Birth: 15.08.2001   |   Date of Expiry: 15.08.2031', x + 210, y + 250);

  // Urdu Address Lines
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('موجودہ پتہ: طوطکی، تحصیل بانڈہ داؤد شاہ، ضلع کرک', x + 40, y + 320);
  ctx.fillText('مستقل پتہ: طوطکی، تحصیل بانڈہ داؤد شاہ، ضلع کرک', x + 40, y + 360);

  // Return Notice
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('گمشدہ کارڈ ملنے پر قریبی لیٹر بکس میں ڈال دیں', 0, y + 415);

  ctx.restore();

  return await canvasToFile(canvas, 'Sample_Pakistani_CNIC.jpg');
}
