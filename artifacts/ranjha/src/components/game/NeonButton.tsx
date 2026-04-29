import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

export function NeonButton({ 
  children, 
  variant = "primary", 
  size = "md", 
  glow = true,
  className = "",
  ...props 
}: NeonButtonProps) {
  const baseClasses = "relative font-display font-bold uppercase tracking-widest overflow-hidden group";
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    xl: "px-12 py-5 text-2xl"
  };
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground border border-primary/50",
    secondary: "bg-secondary text-secondary-foreground border border-secondary/50",
    accent: "bg-accent text-accent-foreground border border-accent/50",
    ghost: "bg-transparent text-foreground border border-white/20 hover:bg-white/10"
  };

  const glowStyle = glow && variant !== 'ghost' ? {
    boxShadow: `0 0 15px hsl(var(--${variant}))`
  } : {};

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={glowStyle}
      {...props}
    >
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}
