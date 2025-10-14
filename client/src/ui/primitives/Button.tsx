import React, { HTMLAttributes } from "react";
import { cva, VariantProps } from "class-variance-authority";

const buttonStyles = cva(
  "inline-flex items-center justify-center select-none transition-colors border cursor-pointer",
  {
    variants: {
      size: {
        default: "m-2 px-2 py-1",
      },
      variant: {
        default:
          "text-[#33FF33] bg-black border-[#33FF33] hover:bg-[#33FF33] hover:text-black",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed ",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      disabled: false,
    },
  }
);

type ButtonPrimitiveProps = HTMLAttributes<HTMLButtonElement | HTMLLabelElement> &
  VariantProps<typeof buttonStyles> & {
    as?: "button" | "label";
  };

export const Button: React.FC<ButtonPrimitiveProps> = ({
  as: Component = "button",
  className,
  size,
  variant,
  disabled,
  ...props
}) => {
  return (
    <Component
      className={buttonStyles({ size, variant, disabled }) + (className ? ` ${className}` : "")}
      style={{ padding: "4px 8px" }} 
      {...props}
    />
  );
};
