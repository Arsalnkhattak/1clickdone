import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { HiOutlineExclamation } from 'react-icons/hi';

export default function ConfirmClearDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <HiOutlineExclamation className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">{title || 'Are you sure?'}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {message || 'This action will discard the current scanned pages. This cannot be undone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Clear Session
          </Button>
        </div>
      </div>
    </Modal>
  );
}
