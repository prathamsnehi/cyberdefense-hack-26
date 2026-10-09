import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-medium select-none",
    "transition-[transform,color,background-color,border-color] duration-(--duration-fast) ease-out",
    "active:scale-[0.97] motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent-brand-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline:
          "border border-border bg-transparent text-foreground hover:border-hairline-strong hover:bg-secondary",
        ghost: "bg-transparent text-foreground hover:bg-secondary",
        link: "h-auto px-0 text-accent-brand underline-offset-4 hover:text-accent-brand-hover hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 px-3 text-small",
        default: "h-10 px-4 text-small",
        lg: "h-12 px-6 text-body",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
