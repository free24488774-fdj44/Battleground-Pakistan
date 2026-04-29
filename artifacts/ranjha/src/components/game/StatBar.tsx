import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export function StatBar({ label, value, max = 100, color = "bg-primary" }: StatBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs font-display tracking-wider uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}/{max}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
          style={{ boxShadow: `0 0 10px var(--${color.replace('bg-', '')})` }}
        />
      </div>
    </div>
  );
}
