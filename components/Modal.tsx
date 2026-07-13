"use client";
import { m, AnimatePresence, LazyMotion, domAnimation, easeOut } from "framer-motion";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  /* Close on Escape key and trap focus within the modal */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    /* Move focus into modal when it opens */
    setTimeout(
      () =>
        modalRef.current?.querySelector<HTMLElement>("button, input")?.focus(),
      50,
    );

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open && (
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <m.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={onClose}
            />
            <m.div
              ref={modalRef}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 z-10"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  id="modal-title"
                  className="text-lg font-bold text-[#1B2B4B]"
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
              {children}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
