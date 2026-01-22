
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out rounded-full"
      style={{ width: `${value || 0}%` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
