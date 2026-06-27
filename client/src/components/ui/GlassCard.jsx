import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

const variants = {
  default: 'glass-card',
  elevated: 'glass-elevated',
  flat: 'glass-flat',
};

export default function GlassCard({
  children,
  variant = 'default',
  className = '',
  hover = true,
  as: Component = 'div',
  animate = true,
  ...props
}) {
  const Wrapper = animate ? motion.div : Component;

  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' },
      }
    : {};

  return (
    <Wrapper
      className={cn(
        variants[variant],
        'p-4 sm:p-5',
        hover && 'hover:scale-[1.01] active:scale-[0.99]',
        'transition-all duration-200',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Wrapper>
  );
}
