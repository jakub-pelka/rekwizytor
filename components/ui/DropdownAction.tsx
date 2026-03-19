import { Fragment, ReactNode } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { Button, ButtonProps } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface DropdownItem {
    label: string
    icon?: ReactNode
    onClick?: () => void
    href?: string
    disabled?: boolean
    isLoading?: boolean
    danger?: boolean
}

interface DropdownActionProps extends Omit<ButtonProps, 'onClick' | 'children'> {
    label?: string
    icon?: ReactNode
    items?: DropdownItem[]
    children?: ReactNode | ((props: { close: () => void }) => ReactNode)
    showChevron?: boolean
    menuWidth?: string
    align?: 'left' | 'right'
}

export function DropdownAction({
    label,
    icon,
    items,
    children,
    variant = 'secondary',
    showChevron = true,
    menuWidth = 'w-56',
    align = 'right',
    className,
    ...props
}: DropdownActionProps) {

    return (
        <Menu as="div" className="relative inline-block text-left">
            {({ close }) => (
                <>
                    <MenuButton as={Fragment}>
                        <Button
                            variant={variant}
                            className={cn('h-10 transition-all data-open:bg-neutral-800', className)}
                            {...props}
                        >
                            {icon && <span className={cn(label ? 'mr-2' : '')}>{icon}</span>}
                            {label && <span className="hidden sm:inline">{label}</span>}
                            {showChevron && (
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200 ml-2 group-data-open:rotate-180',
                                        !label ? 'hidden sm:block' : ''
                                    )}
                                />
                            )}
                        </Button>
                    </MenuButton>

                    <MenuItems
                        anchor={`${align === 'right' ? 'bottom end' : 'bottom start'}`}
                        className={cn(
                            'block z-9999 pt-2 focus:outline-none min-w-(--button-width)',
                            menuWidth
                        )}
                        transition
                    >
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-white/5 p-1 transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 origin-top-right">
                            {children
                                ? (typeof children === 'function' ? children({ close }) : children)
                                : items?.map((item, index) => {
                                    const content = (
                                        <>
                                            {item.isLoading ? (
                                                <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                                            ) : item.icon ? (
                                                <span className={cn('mr-3 h-4 w-4', item.danger ? 'text-red-400' : 'text-neutral-400 group-hover:text-white group-data-focus:text-white')}>
                                                    {item.icon}
                                                </span>
                                            ) : null}
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-medium leading-none">{item.label}</span>
                                            </div>
                                        </>
                                    )

                                    const itemClasses = cn(
                                        'group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer',
                                        'data-focus:bg-neutral-800',
                                        item.danger
                                            ? 'text-red-400 data-focus:text-red-300 data-focus:bg-red-400/10'
                                            : 'text-neutral-300 data-focus:text-white hover:text-white', // duplicate hover for non-headless backup
                                        (item.disabled || item.isLoading) && 'opacity-50 cursor-not-allowed'
                                    )

                                    return (
                                        <MenuItem key={index} disabled={item.disabled || item.isLoading}>
                                            {item.href ? (
                                                <a href={item.href} className={itemClasses}>
                                                    {content}
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        if (item.onClick) item.onClick()
                                                    }}
                                                    className={itemClasses}
                                                >
                                                    {content}
                                                </button>
                                            )}
                                        </MenuItem>
                                    )
                                })}
                        </div>
                    </MenuItems>
                </>
            )}
        </Menu>
    )
}
