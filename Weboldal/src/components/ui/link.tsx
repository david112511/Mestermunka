
import * as React from "react"
import { Link as RouterLink, LinkProps as RouterLinkProps } from "react-router-dom"
import { cn } from "@/lib/utils"

export interface LinkProps extends RouterLinkProps, React.RefAttributes<HTMLAnchorElement> {
  className?: string
  children?: React.ReactNode
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <RouterLink
        ref={ref}
        className={cn(
          "text-primary hover:text-primary/90 transition-colors underline-offset-4 hover:underline",
          className
        )}
        {...props}
      />
    )
  }
)
Link.displayName = "Link"

export { Link }
