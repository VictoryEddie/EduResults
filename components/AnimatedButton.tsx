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
        <span className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          Please wait...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
