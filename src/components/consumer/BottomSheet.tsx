'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { t } from '@/theme/colors';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({ isOpen, onClose, title, children, maxHeight = '90vh' }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="portal-overlay"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      />
      <div
        className="slide-up"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          maxHeight,
          overflowY: 'auto',
          background: t.surface,
          borderTop: `1px solid ${t.border}`,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.txt }}>{title}</h3>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.txtFaint }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        <div style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          {children}
        </div>
      </div>
    </>
  );
}
