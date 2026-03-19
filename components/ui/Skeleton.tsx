import { cn } from "@/utils/cn"

function Skeleton({
    className,
    ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-neutral-800", className)}
            {...props}
        />
    )
}

export { Skeleton }
