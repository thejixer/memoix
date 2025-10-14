import React, { InputHTMLAttributes } from "react";
import { cva, VariantProps } from "class-variance-authority";

const inputStyles = cva(
  "bg-black text-[#33FF33] border border-[#33FF33] outline-none placeholder-[#119c11] transition-colors",
  {
    variants: {
      size: {
        default: "px-2 py-1 m-2", // padding: 4px 8px, margin: 8px
        small: "px-1 py-0.5 m-1",
        large: "px-3 py-2 m-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

type InputPrimitiveProps = InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputStyles>;

export const Input: React.FC<InputPrimitiveProps> = ({ size, className, ...props }) => {
  return <input className={inputStyles({ size }) + (className ? ` ${className}` : "")} {...props} />;
};
