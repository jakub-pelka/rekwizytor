'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { refreshSearchIndex } from '@/app/actions/unified-search'

import { AIBudgetExceededError } from '@/utils/ai/budget'
import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'

/**
 * Generate embedding for a single group (Multi-Vector)
 */
export async function generateGroupEmbedding(groupId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Fetch group
    const { data: group, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', groupId)
        .single()

    if (fetchError || !group) {
        console.error('Failed to fetch group:', fetchError)
        return { success: false, error: fetchError?.message || 'Group not found' }
    }

    try {
        // Step 1: Enrich (returns { identity, physical, context })
        const enrichment = await enrichGroupNameForEmbedding(group.name)
        console.log(`Enriched "${group.name}":
        - ID: ${enrichment.identity}
        - PHYS: ${enrichment.physical}
        - CTX: ${enrichment.context}`)

        // Step 2: Generate 3 embeddings in parallel
        const [identityEmb, physicalEmb, contextEmb] = await Promise.all([
            generateEmbedding(enrichment.identity || group.name, TaskType.RETRIEVAL_DOCUMENT),
            generateEmbedding(enrichment.physical || '-', TaskType.RETRIEVAL_DOCUMENT), // Empty fallback
            generateEmbedding(enrichment.context || '-', TaskType.RETRIEVAL_DOCUMENT)   // Empty fallback
        ])

        // Step 3: Update group with all 3 vectors
        const { error: updateError } = await supabase
            .from('groups')
            .update({
                embedding_identity: JSON.stringify(identityEmb),
                embedding_physical: JSON.stringify(physicalEmb),
                embedding_context: JSON.stringify(contextEmb)
            } as any)
            .eq('id', groupId)

        if (updateError) {
            console.error('Failed to update group embedding:', updateError)
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (embeddingError: any) {
        console.error('Failed to generate embedding:', embeddingError)
        return { success: false, error: embeddingError.message }
    }
}

/**
 * Generate embeddings for all groups without embeddings
 */
export async function generateAllGroupEmbeddings(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[]
}> {
    const supabase = await createClient()

    // Fetch groups (checking updated_at/created_at to re-process all would be best, but for now we process all active groups)
    console.log('🔍 [GROUPS] Fetching all groups...')
    const { data: groups, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .is('deleted_at', null)

    if (fetchError) {
        console.error('❌ [GROUPS] Failed to fetch groups:', fetchError)
        return { success: false, processed: 0, failed: 0, errors: [fetchError.message] }
    }

    if (!groups || groups.length === 0) {
        console.log('⚠️ [GROUPS] No groups found')
        return { success: true, processed: 0, failed: 0, errors: [] }
    }

    console.log(`📦 [GROUPS] Found ${groups.length} groups to process`)

    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process each group
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        console.log(`\n${'='.repeat(60)}`)
        console.log(`📝 [${i + 1}/${groups.length}] Processing group: "${group.name}"`)
        console.log(`${'='.repeat(60)}`)

        try {
            // Step 1: Enrich
            console.log(`   🔤 [STEP 1] Enriching group name (MV)...`)
            const enrichment = await enrichGroupNameForEmbedding(group.name)
            console.log(`   ✅ Enriched: ID="${enrichment.identity.substring(0, 20)}...", PHYS="${enrichment.physical.substring(0, 20)}..."`)

            // Step 2: Generate embeddings
            console.log(`   🔢 [STEP 2] Generating 3 vectors...`)
            const [identityEmb, physicalEmb, contextEmb] = await Promise.all([
                generateEmbedding(enrichment.identity || group.name, TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.physical || 'brak', TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.context || 'brak', TaskType.RETRIEVAL_DOCUMENT)
            ])
            console.log(`   ✅ [STEP 2] Embeddings generated`)

            // Step 3: Save
            console.log(`   💾 [STEP 3] Saving to Supabase...`)
            const { data: updateData, error: updateError } = await supabase
                .from('groups')
                .update({
                    embedding_identity: JSON.stringify(identityEmb),
                    embedding_physical: JSON.stringify(physicalEmb),
                    embedding_context: JSON.stringify(contextEmb)
                } as any)
                .eq('id', group.id)
                .select('id')

            if (updateError) {
                console.error(`   ❌ [STEP 3] FAILED to save: ${updateError.message}`)
                failed++
                errors.push(`${group.name}: ${updateError.message}`)
            } else {
                const rowsAffected = updateData?.length || 0
                if (rowsAffected > 0) {
                    console.log(`   ✅ [STEP 3] SAVED successfully`)
                    processed++
                } else {
                    console.log(`   ⚠️ [STEP 3] Query executed but 0 rows affected (RLS issue?)`)
                    failed++
                    errors.push(`${group.name}: 0 rows affected`)
                }
            }
        } catch (embeddingError: any) {
            console.error(`   ❌ [ERROR] ${embeddingError.message}`)
            failed++
            errors.push(`${group.name}: ${embeddingError.message}`)
            // Limit AI wyczerpany: kolejne grupy też się nie uda, nie czekamy na każdą z osobna.
            if (embeddingError instanceof AIBudgetExceededError) break
        }

        console.log(`   📊 Progress: ${processed} processed, ${failed} failed`)

        // Delay to avoid rate limiting
        if (i < groups.length - 1) {
            // Increased delay as we do 3x more embedding calls
            console.log(`   ⏳ Waiting 5s before next group...`)
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
    }

    // Refresh search index
    console.log(`\n🔄 Refreshing search index...`)
    try {
        await refreshSearchIndex()
        console.log(`✅ Search index refreshed`)
    } catch (e) {
        console.error('❌ Failed to refresh search index:', e)
    }

    return {
        success: failed === 0,
        processed,
        failed,
        errors
    }
}
