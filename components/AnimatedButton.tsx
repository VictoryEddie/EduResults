"use client";
import { motion } from "framer-motion";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: "bg-[#1B2B4B] text-white",
  secondary:
    "border border-[#1B2B4B] text-[#1B2B4B] hover:bg-[#1B2B4B] hover:text-white",
  danger: "bg-red-500 text-white hover:bg-red-600",
  ghost: "text-[#1B2B4B] hover:bg-gray-100",
};

export default function AnimatedButton({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.03 }}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-1.5 h-full min-h-[20px]">
          <motion.span
            animate={{ y: [0, -4, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
            className="w-1.5 h-1.5 bg-current rounded-full"
          />
          <motion.span
            animate={{ y: [0, -4, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            className="w-1.5 h-1.5 bg-current rounded-full"
          />
          <motion.span
            animate={{ y: [0, -4, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="w-1.5 h-1.5 bg-current rounded-full"
          />
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
