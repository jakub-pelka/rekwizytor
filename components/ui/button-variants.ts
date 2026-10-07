import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Przycisk w stylu „Bilet” z design systemu (karta Button, klasy .rk-btn w styles/rk/components.css).
// Cztery warianty: primary, secondary, ghost, danger. `link` to nie przycisk, tylko link tekstowy
// w kolorze kurtyna-text (opis marki: bordo w roli linku).
const variants = {
    variant: {
        primary: "rk-btn--primary",
        secondary: "rk-btn--secondary",
        ghost: "rk-btn--ghost",
        danger: "rk-btn--danger",
        // Stare nazwy sprzed design systemu; przy migracji ekranów zamieniamy je na cztery powyższe.
        destructive: "rk-btn--danger",
        outline: "rk-btn--secondary",
        link: "inline-flex items-center gap-2 text-kurtyna-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        glassy: "rk-btn--secondary",
        "glassy-primary": "rk-btn--primary",
        "glassy-danger": "rk-btn--danger",
        "glassy-secondary": "rk-btn--secondary",
        "glassy-success": "rk-btn--secondary",
    },
    size: {
        sm: "rk-btn--sm",
        md: "",
        lg: "rk-btn--lg",
        icon: "rk-btn--icon",
    },
}

export const buttonVariants = ({
    variant = "primary",
    size = "md",
    className = ""
}: {
    variant?: keyof typeof variants.variant
    size?: keyof typeof variants.size
    className?: string
} = {}) => {
    if (variant === "link") return cn(variants.variant.link, className)
    return cn(
        "rk-btn",
        variants.variant[variant],
        variants.size[size],
        className
    )
}

export { variants }
