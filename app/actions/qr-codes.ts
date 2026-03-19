'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { customAlphabet } from 'nanoid'
const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6)

export interface QrCode {
    code: string
    target_url: string
    description: string | null
    created_by: string
    access_level: 'public' | 'authenticated' | 'private'
    active: boolean
    created_at: string
    clicks: number
    batch_group: string | null
    short_id?: string
}

export async function getQrCodes() {
    const supabase = await createClient()

    // With RLS, this will return what the user is allowed to see
    const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching QR codes:', error)
        throw new Error('Failed to fetch QR codes')
    }

    return data as QrCode[]
}

export async function createQrCode(data: {
    target_url: string
    description: string
    access_level: 'public' | 'authenticated' | 'private'
    batch_group?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const code = generateCode()

    const { data: newCode, error } = await supabase
        .from('qr_codes')
        .insert({
            code,
            target_url: data.target_url,
            description: data.description,
            created_by: user.id,
            access_level: data.access_level,
            active: true,
            batch_group: data.batch_group
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating QR code:', error)
        throw new Error('Failed to create QR code')
    }

    revalidatePath('/settings/qr-codes')
    return newCode as QrCode
}

export async function updateQrCode(code: string, data: Partial<QrCode>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Filter out restricted fields
    const { created_by, clicks, created_at, ...updateData } = data

    const { error } = await supabase
        .from('qr_codes')
        .update(updateData)
        .eq('code', code)
        .eq('created_by', user.id) // Ensure ownership

    if (error) {
        console.error('Error updating QR code:', error)
        throw new Error('Failed to update QR code')
    }

    revalidatePath('/settings/qr-codes')
    return { success: true }
}

export async function deleteQrCode(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('code', code)
        .eq('created_by', user.id) // Ensure ownership

    if (error) {
        console.error('Error deleting QR code:', error)
        throw new Error('Failed to delete QR code')
    }

    revalidatePath('/settings/qr-codes')
    return { success: true }
}

export async function getOrCreateGroupQrCode(groupId: string, groupName: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // We use relative URL for internal redirects
    const targetUrl = `/groups?viewGroup=${groupId}`

    // 1. Try to find existing QR code for this target
    const { data: existingCodes } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('target_url', targetUrl)
        .limit(1)

    if (existingCodes && existingCodes.length > 0) {
        return existingCodes[0] as QrCode
    }

    if (!user) return null

    // 2. Create new if not found
    // Uses the same generation logic as createQrCode but programmatic
    const code = generateCode()

    const { data: newCode, error } = await supabase
        .from('qr_codes')
        .insert({
            code,
            target_url: targetUrl,
            description: `Grupa: ${groupName}`,
            created_by: user.id,
            access_level: 'authenticated', // Groups are usually protected
            active: true,
            batch_group: 'Grupy' // Auto-grouping
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating group QR code:', error)
        return null
    }

    return newCode as QrCode
}
