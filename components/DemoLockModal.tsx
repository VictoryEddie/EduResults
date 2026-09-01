"use client";

import Modal from "@/components/Modal";
import { Lock, ArrowRight, ShieldAlert, ExternalLink } from "lucide-react";

interface DemoLockModalProps {
  open: boolean;
  onClose: () => void;
  actionTitle?: string;
}

export default function DemoLockModal({ open, onClose, actionTitle }: DemoLockModalProps) {
  // Configurable website quote link (defaults to Victory Edwin's projects page)
  const quoteUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://victory-edwin.vercel.app/projects.html";

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="text-center py-4 px-2">
        {/* Icon Header */}
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Demo Mode Restriction
        </h3>

        {actionTitle && (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600 mb-4">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>&ldquo;{actionTitle}&rdquo; is locked</span>
          </div>
        )}

        {/* Description */}
        <p className="text-slate-600 font-medium text-sm leading-relaxed mb-6">
          This administrative feature is restricted in the public demo to protect sample database records.
          <br className="hidden sm:block" />
          Get a fully unlocked, customized version of <strong className="text-slate-900 font-bold">EduResults</strong> built specifically for your school!
        </p>

        {/* Feature highlights */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left mb-6 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold">✓</span> Custom branding, logo, and domain
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold">✓</span> Dedicated database & admin control
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold">✓</span> Automated result publishing & WhatsApp/Email SMS
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            Close
          </button>
          <a
            href={quoteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-2/3 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
          >
            <span>Request a Quote</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
