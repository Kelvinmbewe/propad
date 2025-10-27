'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden rounded-md text-sm font-medium transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white hover:bg-neutral-800',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        outline: 'border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900',
        ghost: 'hover:bg-neutral-100 hover:text-neutral-900',
        destructive: 'bg-red-600 text-white hover:bg-red-700'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

type Ripple = { id: number; x: number; y: number; size: number };

function setRefValue<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, onClick, ...props }, forwardedRef) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);
    const timeoutsRef = React.useRef<number[]>([]);

    React.useEffect(() => {
      return () => {
        timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
        timeoutsRef.current = [];
      };
    }, []);

    const triggerRipple = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.1;
      const isKeyboardEvent = event.clientX === 0 && event.clientY === 0;
      const x = isKeyboardEvent ? rect.width / 2 - size / 2 : event.clientX - rect.left - size / 2;
      const y = isKeyboardEvent ? rect.height / 2 - size / 2 : event.clientY - rect.top - size / 2;
      const id = Date.now();

      setRipples((prev) => [...prev, { id, x, y, size }]);
      const timeout = window.setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        timeoutsRef.current = timeoutsRef.current.filter((stored) => stored !== timeout);
      }, 750);
      timeoutsRef.current.push(timeout);
    }, []);

    const { type = 'button', disabled, ...restProps } = props;

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLElement>) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        triggerRipple(event);
        onClick?.(event as React.MouseEvent<HTMLButtonElement>);
      },
      [disabled, onClick, triggerRipple]
    );

    const renderContent = React.useCallback(
      (content: React.ReactNode) => (
        <>
          <span className="pointer-events-none absolute inset-0 overflow-hidden">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="button-ripple"
                style={{
                  width: ripple.size,
                  height: ripple.size,
                  top: ripple.y,
                  left: ripple.x
                }}
              />
            ))}
          </span>
          <span className="relative z-10 inline-flex items-center justify-center gap-2">{content}</span>
        </>
      ),
      [ripples]
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement & { ref?: React.Ref<HTMLElement> };
      const childProps = child.props as { className?: string; onClick?: React.MouseEventHandler<HTMLElement>; children?: React.ReactNode };

      const mergedClassName = cn(buttonVariants({ variant, size, className }), childProps.className);

      const composedRef = (node: HTMLElement | null) => {
        setRefValue(child.ref, node);
        setRefValue(forwardedRef, node as HTMLButtonElement | null);
      };

      const handleChildClick: React.MouseEventHandler<HTMLElement> = (event) => {
        handleClick(event);
        if (disabled) {
          return;
        }
        childProps.onClick?.(event);
      };

      return React.cloneElement(child, {
        className: mergedClassName,
        onClick: handleChildClick,
        ref: composedRef,
        ...restProps,
        ...(disabled ? { 'aria-disabled': true, tabIndex: -1 } : {}),
        children: renderContent(childProps.children)
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={forwardedRef}
        onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>}
        type={type}
        disabled={disabled}
        {...restProps}
      >
        {renderContent(children)}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
