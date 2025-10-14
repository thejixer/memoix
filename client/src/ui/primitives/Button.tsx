import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

const buttonStyles = cva(
  "m-2 px-2 py-1 border cursor-pointer font-medium transition-colors",
  {
    variants: {
      intent: {
        default: "text-green-400 bg-black border-green-400 hover:bg-green-400 hover:text-black",
        primary: "text-white bg-green-500 border-green-500 hover:bg-green-600",
        secondary: "text-black bg-white border-gray-400 hover:bg-gray-100",
      },
      size: {
        sm: "text-sm px-2 py-1",
        md: "text-base px-4 py-2",
        lg: "text-lg px-6 py-3",
      },
    },
    defaultVariants: {
      intent: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export const Button: React.FC<ButtonProps> = ({ intent, size, className, ...props }) => {
  return <button className={buttonStyles({ intent, size, className })} {...props} />;
};
