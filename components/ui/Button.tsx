"use client"

import * as React from "react"
import { buttonVariants, variants } from "./button-variants"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants.variant
    size?: keyof typeof variants.size
    isLoading?: boolean
    /** Etykieta dla czytników ekranu w trakcie zapisu, gdy przycisk nie ma własnego aria-label. */
    loadingLabel?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export { buttonVariants }


// W trakcie zapisu przycisk pokazuje Trzy dzwonki zamiast etykiety i zachowuje szerokość:
// treść zostaje w układzie, ale jest niewidoczna. Bez atrybutu disabled, bo ten przygasza przycisk;
// zamiast tego aria-disabled i zablokowane kliknięcie (także submit formularza Enterem).
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading = false, loadingLabel = "Zapisywanie", leftIcon, rightIcon, children, onClick, disabled, ...props }, ref) => {

        return (
            <button
                {...props}
                className={buttonVariants({ variant, size, className: isLoading ? `relative ${className ?? ""}` : className })}
                ref={ref}
                disabled={isLoading ? undefined : disabled}
                aria-disabled={isLoading || undefined}
                aria-busy={isLoading || undefined}
                aria-label={isLoading ? (props["aria-label"] ?? loadingLabel) : props["aria-label"]}
                onClick={isLoading ? (e) => e.preventDefault() : onClick}
            >
                {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rk-bells" aria-hidden="true"><i></i><i></i><i></i></span>
                    </span>
                )}
                {leftIcon && <span className={isLoading ? "invisible" : undefined}>{leftIcon}</span>}
                {isLoading ? <span className="invisible">{children}</span> : children}
                {rightIcon && <span className={isLoading ? "invisible" : undefined}>{rightIcon}</span>}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
