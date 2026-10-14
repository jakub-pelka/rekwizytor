import { cn } from "@/utils/cn"

function Skeleton({
    className,
    ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-[var(--surface-raised)]", className)}
            {...props}
        />
    )
}

export { Skeleton }
