import React from "react";
import { cva, VariantProps } from "class-variance-authority";

const typography = cva(
  "antialiased leading-tight ",
  {
    variants: {
      variant: {
        display: "tracking-tight",
        h1: "tracking-tight text-xl",
        h2: "",
        body: "",
        caption: "uppercase tracking-wide",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        bold: "font-bold",
      },
      color: {
        white: "text-[#FFFFFF]",
        primary: "text-[#33FF33]",
        black: "text-[#000000]",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
      truncate: {
        true: "truncate",
        false: "",
      },
    },
    defaultVariants: {
      variant: "body",
      size: "md",
      weight: "normal",
      color: "primary",
      align: "left",
      truncate: false,
    },
  }
);

export type TypographyProps<C extends React.ElementType = "span"> = {
  as?: C;
  children?: React.ReactNode;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<C>, "as" | "children" | "className"> &
  VariantProps<typeof typography>;

export const Typography = React.forwardRef(
  <C extends React.ElementType = "span">(
    props: TypographyProps<C>,
    ref: React.Ref<Element>
  ) => {
    const {
      as,
      children,
      className,
      variant,
      size,
      weight,
      color,
      align,
      truncate,
      ...rest
    } = props;

    const Component = (as || "span") as React.ElementType;

    const classes = typography({
      variant,
      size,
      weight,
      color,
      align,
      truncate,
    });

    return (
      <Component
        ref={ref}
        className={`${classes}${className ? ` ${className}` : ""}`}
        {...(rest as any)}
      >
        {children}
      </Component>
    );
  }
) as <C extends React.ElementType = "span">(
  props: TypographyProps<C> & { ref?: React.Ref<Element> }
) => React.ReactElement | null;
