'use client'

import { useState, useEffect, useId } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, X, User, Clock, AlertCircle, Mail, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { approveUser } from '@/app/actions/admin/approve-user'
import { activeTheatreName } from '@/lib/theatre'
import { Button } from '@/components/ui/Button'
import { RoleChoice } from '@/components/team/TeamDialogs'
import type { TheatreRole } from '@/lib/access'
import { format } from 'date-fns'

interface Profile {
    id: string
    full_name: string | null
    role: 'admin' | 'user' | 'manager'
    status: 'pending' | 'approved' | 'rejected'
    created_at?: string
    email?: string | null
}

export function UserApprovalList() {
    const t = useTranslations('Settings.UserApproval')
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'approve' | 'reject', user: Profile } | null>(null)
    // Rola w teatrze nadawana przy zatwierdzeniu (domyślnie Rekwizytor) i nazwa teatru, do którego osoba dołączy.
    const [role, setRole] = useState<TheatreRole>('member')
    const [theatreName, setTheatreName] = useState<string | null>(null)
    const titleId = useId()
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchPendingUsers()
        activeTheatreName(supabase).then(setTheatreName)
    }, [])

    // Esc zamyka okno potwierdzenia jak „Anuluj”.
    useEffect(() => {
        if (!confirmAction) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmAction(null) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [confirmAction])

    const fetchPendingUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error

            const typedData: Profile[] = (data || []).map(p => ({
                ...p,
                role: (p.role as 'admin' | 'user' | 'manager') || 'user',
                status: (p.status as 'pending' | 'approved' | 'rejected') || 'pending',
                created_at: p.created_at ?? undefined
            }))

            setPendingUsers(typedData)
        } catch (error) {
            console.error('Error fetching pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async () => {
        if (!confirmAction) return

        const { id, type } = confirmAction
        setActionLoading(id)
        setConfirmAction(null)

        const result = await approveUser(id, type === 'approve' ? 'approved' : 'rejected', role)

        if (result.success) {
            setPendingUsers(pendingUsers.filter(p => p.id !== id))
            router.refresh()
        } else {
            console.error('Failed to update status:', result.error)
            alert(result.error ?? t('errorUpdating'))
        }
        setActionLoading(null)
    }

    if (loading) {
        return <div className="animate-pulse h-20 bg-neutral-900/50 rounded-lg"></div>
    }

    if (pendingUsers.length === 0) {
        return null
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                <div className="text-lg font-medium text-white font-sans!">{t('title')}</div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                <div className="divide-y divide-neutral-800">
                    {pendingUsers.map((user) => (
                        <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-white">{user.full_name || t('unknownUser')}</div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-neutral-500">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            <span className="font-mono">{user.email || user.id.slice(0, 8)}</span>
                                        </div>
                                        {user.created_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                <span>{format(new Date(user.created_at), 'PPP p')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 self-end sm:self-center">
                                <button
                                    onClick={() => { setRole('member'); setConfirmAction({ id: user.id, type: 'approve', user }) }}
                                    disabled={!!actionLoading}
                                    className="p-2 rounded-lg bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors disabled:opacity-50"
                                    title={t('approve')}
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmAction({ id: user.id, type: 'reject', user })}
                                    disabled={!!actionLoading}
                                    className="p-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                    title={t('reject')}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Okno potwierdzenia: karta Modal z design systemu (jak okna na /settings/team) */}
            {confirmAction && (
                <div className="rk-overlay fixed inset-0 z-50 rounded-none">
                    <div
                        className={`rk-modal ${confirmAction.type === 'reject' ? 'rk-modal--confirm' : ''} max-md:!absolute max-md:!inset-x-0 max-md:!bottom-0 max-md:!w-full max-md:!max-w-none max-md:!rounded-b-none`}
                        role={confirmAction.type === 'reject' ? 'alertdialog' : 'dialog'}
                        aria-modal="true"
                        aria-labelledby={titleId}
                    >
                        <div className="rk-modal__head">
                            {confirmAction.type === 'reject' && (
                                <span className="rk-modal__icon rk-modal__icon--danger"><AlertCircle /></span>
                            )}
                            <div>
                                <h3 className="rk-modal__title" id={titleId}>
                                    {confirmAction.type === 'approve' ? t('confirmApproveTitle') : t('confirmRejectTitle')}
                                </h3>
                                <p className="rk-modal__desc">
                                    {confirmAction.type === 'approve'
                                        ? t('confirmApproveDesc', { name: confirmAction.user.full_name || confirmAction.user.email || t('unknownUser') })
                                        : t('confirmRejectDesc', { name: confirmAction.user.full_name || confirmAction.user.email || t('unknownUser') })
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="rk-modal__body rk-stack">
                            {confirmAction.type === 'approve' && (
                                <>
                                    <div className="rk-alert rk-alert--warning">
                                        <AlertCircle />
                                        <div>
                                            <strong>{t('securityWarningTitle')}</strong>
                                            {t('securityWarningDesc')}
                                        </div>
                                    </div>

                                    <div className="rk-field">
                                        <span className="rk-label">{t('roleField')}</span>
                                        <RoleChoice value={role} onChange={setRole} label={t('roleField')} />
                                        {theatreName && <span className="rk-hint">{t('joinsTheatre', { theatre: theatreName })}</span>}
                                    </div>
                                </>
                            )}

                            {confirmAction.type === 'reject' && (
                                <div className="rk-alert rk-alert--danger">
                                    <AlertCircle />
                                    <div>{t('rejectWarning')}</div>
                                </div>
                            )}
                        </div>

                        <div className="rk-modal__foot">
                            <Button variant="ghost" onClick={() => setConfirmAction(null)} autoFocus={confirmAction.type === 'reject'}>
                                {t('cancel')}
                            </Button>
                            <Button variant={confirmAction.type === 'approve' ? 'primary' : 'danger'} onClick={handleStatusChange}>
                                {confirmAction.type === 'approve' ? t('approve') : t('reject')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
