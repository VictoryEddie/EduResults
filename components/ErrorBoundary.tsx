"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6">
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-white p-12 text-center shadow-2xl shadow-slate-200/40 max-w-md w-full">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
              Something went wrong
            </h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">
              We hit an unexpected snag while loading this component. Please try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-lg shadow-slate-200"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            {this.state.error && process.env.NODE_ENV === "development" && (
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-left overflow-auto border border-slate-100">
                <p className="text-xs font-mono text-rose-500 font-bold whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
