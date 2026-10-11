import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import React from 'react'
import { format } from 'date-fns'
import QRCode from 'qrcode'
import { Database, Json } from '@/types/supabase'

type Performance = Database['public']['Tables']['performances']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type PerformanceProp = Database['public']['Tables']['performance_props']['Row']
type Note = Database['public']['Tables']['notes']['Row']

interface User {
    full_name: string | null
    email: string | undefined
}

interface RequestBody {
    production: Performance
    items: PerformanceProp[]
    scenes?: Scene[]
    notes?: Note[]
    user: User | null
}

async function registerFonts() {
    try {
        const fontPath = process.cwd() + '/public/fonts/Boldonse-Regular.ttf'
        const fs = await import('fs/promises')
        const buffer = await fs.readFile(fontPath)
        const base64 = buffer.toString('base64')
        Font.register({
            family: 'Boldonse',
            src: `data:font/truetype;base64,${base64}`,
        })
    } catch (e) {
        console.error('Failed to load Boldonse font:', e)
    }
    Font.register({
        family: 'Roboto',
        fonts: [
            { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
            { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
        ],
    })
}

const styles = StyleSheet.create({
    page: { padding: 30, paddingBottom: 65, fontFamily: 'Roboto', fontSize: 10, color: '#1a1a1a' },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 10 },
    headerInfo: { flex: 1, alignItems: 'flex-end' },
    poster: { width: 80, height: 120, marginRight: 15, objectFit: 'cover', borderRadius: 4 },
    titleSection: { flex: 1 },
    title: { fontSize: 24, fontFamily: 'Boldonse', marginBottom: 5 },
    status: { fontSize: 10, color: '#666', marginBottom: 5, padding: 4, backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderRadius: 3 },
    meta: { fontSize: 9, color: '#666', marginBottom: 2 },

    sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 2, textTransform: 'uppercase' },
    subSectionTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#444' },

    actDivider: {
        backgroundColor: '#e6e6e6',
        padding: 5,
        paddingLeft: 10,
        fontWeight: 'bold',
        fontSize: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginTop: 0,
        marginBottom: 0
    },

    // Tables
    table: { width: '100%', marginBottom: 10 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center', minHeight: 20 },
    tableHeader: { backgroundColor: '#f5f5f5', borderBottomColor: '#ddd', fontWeight: 'bold', minHeight: 20 },
    tableCell: { padding: 4, fontSize: 9 },

    // Scenes Table
    colSceneNum: { width: '10%' },
    colSceneName: { width: '35%' },
    colTasks: { width: '55%' },

    // Checklist Layout
    checklistGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    checklistItem: { width: '50%', flexDirection: 'row', marginBottom: 4, paddingRight: 5 },
    checkbox: { width: 12, height: 12, borderWidth: 1, borderColor: '#ccc', marginRight: 5 },
    itemName: { fontSize: 9 },

    // Notes
    noteCard: { marginBottom: 8, padding: 8, backgroundColor: '#fafafa', borderLeftWidth: 3, borderLeftColor: '#ccc', borderRadius: 2 },
    noteTitle: { fontWeight: 'bold', fontSize: 10, marginBottom: 3 },
    noteContent: { fontSize: 9, color: '#333' },
    masterNoteColor: { borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb' },

    // Tasks in scene table
    tasksList: { paddingLeft: 5 },
    taskItem: { flexDirection: 'row', marginBottom: 2 },
    taskCheckbox: { width: 8, height: 8, borderWidth: 1, borderColor: '#999', marginRight: 4, marginTop: 1 },
    taskText: { fontSize: 8, flex: 1, color: '#444' },

    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#999', fontSize: 8, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10 },
})

// Helper to extract text from Tiptap/ProseMirror JSON
const extractTextFromContent = (content: Json | null): string => {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (typeof content === 'object') {
        if ('text' in content && typeof content.text === 'string') {
            return content.text
        }
        if ('content' in content && Array.isArray(content.content)) {
            return content.content.map((node: any) => extractTextFromContent(node)).join(' ')
        }
    }
    return ''
}

const PerformancePdfDocument = ({ production, items, scenes, notes, user, qrCodeUrl }: RequestBody & { qrCodeUrl?: string }) => {
    // 1. Process Master Item List (Deduplicate Items)
    const uniqueItemsMap = new Map<string, string>();
    items.forEach(pi => {
        if (pi.item_name) {
            uniqueItemsMap.set(pi.item_name, pi.item_name)
        }
    });
    const masterItems = Array.from(uniqueItemsMap.values()).sort((a, b) => a.localeCompare(b, 'pl'));

    // 2. Process Scenes
    const sortedScenes = scenes?.sort((a, b) => {
        if (a.act_number !== b.act_number) return (a.act_number || 0) - (b.act_number || 0);
        return a.scene_number - b.scene_number;
    }) || [];

    // 3. Process Props by Scene (for checklist if needed, but user wants "master item list" and "list of scenes")
    // User requested "Performance details", "List of scenes", "Master list of items", "Notes".
    // I will stick to that.

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                    {production.image_url && (
                        <Image src={production.image_url} style={styles.poster} />
                    )}
                    <View style={styles.titleSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={styles.title}>{production.title}</Text>
                                <Text style={styles.status}>Status: {production.status}</Text>
                                {production.premiere_date && <Text style={styles.meta}>Premiera: {format(new Date(production.premiere_date), 'dd.MM.yyyy')}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 8, color: '#999' }}>Wygenerowano: {format(new Date(), 'dd.MM.yyyy HH:mm')}</Text>
                                <Text style={{ fontSize: 8, color: '#999' }}>Przez: {user?.full_name || user?.email || 'System'}</Text>
                                {qrCodeUrl && (
                                    <Image src={qrCodeUrl} style={{ width: 40, height: 40, marginTop: 5 }} />
                                )}
                            </View>
                        </View>

                        {/* Description / Master production note */}
                        {production.notes && (
                            <View style={{ marginTop: 10, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                                <Text style={{ fontSize: 9, color: '#444' }}>{production.notes}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Scenes List with Tasks */}
                {sortedScenes.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Lista Scen i Zadania</Text>
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <View style={[styles.tableCell, styles.colSceneNum]}><Text>Nr</Text></View>
                                <View style={[styles.tableCell, styles.colSceneName]}><Text>Nazwa</Text></View>
                                <View style={[styles.tableCell, styles.colTasks]}><Text>Rekwizyty</Text></View>
                            </View>
                            {sortedScenes.map((scene, i) => {
                                const isNewAct = i === 0 || scene.act_number !== sortedScenes[i - 1].act_number;
                                const sceneProps = items
                                    ?.filter(item => item.scene_number === scene.scene_number)
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || [];
                                
                                return (
                                    <React.Fragment key={scene.id}>
                                        {isNewAct && (
                                            <View style={styles.actDivider} wrap={false}>
                                                <Text>Akt {scene.act_number || '?'}</Text>
                                            </View>
                                        )}
                                        <View style={styles.tableRow} wrap={false}>
                                            <View style={[styles.tableCell, styles.colSceneNum]}>
                                                <Text>{scene.type === 'intermission' ? '-' : scene.scene_number}</Text>
                                            </View>
                                            <View style={[styles.tableCell, styles.colSceneName]}>
                                                <Text>{scene.name || '-'}</Text>
                                            </View>
                                            <View style={[styles.tableCell, styles.colTasks]}>
                                                {sceneProps.length > 0 ? (
                                                    <View style={styles.tasksList}>
                                                        {sceneProps.map((item) => (
                                                            <View key={item.id} style={styles.taskItem}>
                                                                <View style={styles.taskCheckbox} />
                                                                <Text style={styles.taskText}>
                                                                    {item.item_name}{item.description ? ` — ${item.description}` : ''}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : (
                                                    <Text style={{ fontSize: 8, color: '#999' }}>-</Text>
                                                )}
                                            </View>
                                        </View>
                                    </React.Fragment>
                                )
                            })}
                        </View>
                    </View>
                )}

                {/* Master Item List */}
                {masterItems.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Lista Zbiorcza Rekwizytów</Text>
                        <View style={styles.checklistGrid}>
                            {masterItems.map((itemName, index) => (
                                <View key={index} style={styles.checklistItem}>
                                    <View style={styles.checkbox} />
                                    <Text style={styles.itemName}>{itemName}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Notes */}
                {notes && notes.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Notatki</Text>
                        {notes.map((note) => {
                            const textContent = extractTextFromContent(note.content)
                            if (!textContent && !note.title) return null

                            return (
                                <View key={note.id} style={[styles.noteCard, note.is_master ? styles.masterNoteColor : {}]} wrap={false}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={[styles.noteTitle, note.is_master ? { color: '#d97706' } : {}]}>
                                            {note.title} {note.is_master ? '(MASTER)' : ''}
                                        </Text>
                                        <Text style={{ fontSize: 8, color: '#999' }}>
                                            {note.updated_at ? format(new Date(note.updated_at), 'dd.MM.yyyy') : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.noteContent}>{textContent}</Text>
                                </View>
                            )
                        })}
                    </View>
                )}

                <View style={styles.footer} fixed>
                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Boldonse' }}>Rekwizytor </Text>
                        <Text render={({ pageNumber, totalPages }) => (
                            `- Strona ${pageNumber} z ${totalPages}`
                        )} />
                    </View>
                </View>
            </Page>
        </Document>
    )
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()
        if (!body.production) {
            return NextResponse.json({ error: 'Invalid request: production required' }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rekwizytor.vercel.app'
        const performanceUrl = `${baseUrl}/pl/performances/${body.production.id}/props`
        let qrCodeDataUrl: string | undefined
        try {
            qrCodeDataUrl = await QRCode.toDataURL(performanceUrl)
        } catch (e) {
            console.error('Failed to generate QR code:', e)
        }

        await registerFonts()
        const buffer = await renderToBuffer(
            <PerformancePdfDocument
                production={body.production}
                items={body.items || []}
                scenes={body.scenes || []}
                notes={body.notes || []}
                user={body.user}
                qrCodeUrl={qrCodeDataUrl}
            />
        )
        const safeTitle = body.production.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeTitle}_export_${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
            },
        })
    } catch (error) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
}
