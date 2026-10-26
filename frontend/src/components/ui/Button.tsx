import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white hover:bg-[var(--color-primary-hover)]',
        secondary: 'border border-[var(--color-border)] bg-white text-brand-heading hover:bg-purple-50',
        ghost: 'text-brand-heading hover:bg-purple-100',
      },
      size: {
        default: '',
        sm: 'min-h-9 px-3 text-xs',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />
}
