import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Scanned Document',
  },
  imageUrl: {
    type: String,
    required: true,
  },
  ocrText: {
    type: String,
    default: '',
  },
  aspectPreset: {
    type: String,
    enum: ['free', 'a4', 'cnic', 'receipt'],
    default: 'free',
  },
  filterMode: {
    type: String,
    enum: ['magic', 'bw', 'grayscale', 'original'],
    default: 'magic',
  },
  docType: {
    type: String,
    default: 'A4 Document',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Document = mongoose.model('Document', DocumentSchema);
export default Document;
