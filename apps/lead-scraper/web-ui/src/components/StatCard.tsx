import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: number;
  isLoading?: boolean;
  delay?: number;
}

export function StatCard({
  title,
  value,
  isLoading,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-twitter-card border border-twitter-border rounded-xl p-4 hover:border-twitter-primary transition-colors"
    >
      <h3 className="text-xs font-semibold text-twitter-muted uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="text-3xl font-bold text-twitter-text">
        {isLoading ? (
          <div className="h-9 w-16 bg-twitter-secondary rounded animate-pulse" />
        ) : (
          <motion.span
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
