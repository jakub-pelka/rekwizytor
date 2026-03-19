import { createClient } from "@/utils/supabase/server"
import { MapEditor } from "@/components/mapping/MapEditor"
import { MapUploader } from "@/components/mapping/MapUploader"
import { notFound } from "next/navigation"

export default async function LocationMappingPage({ params }: { readonly params: Promise<{ readonly locationId: string }> }) {
    const supabase = await createClient()

    // Await params in Next.js 15+
    const { locationId } = await params
    const locId = locationId

    const { data: location } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locId)
        .single()

    if (!location) {
        notFound()
    }

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{location.name}</h1>
                    <p className="text-neutral-400">Edytor mapy i rozmieszczenia</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#1a1a1a] p-1 rounded-lg border border-neutral-800">
                        <MapEditor
                            locationId={location.id}
                            initialMapUrl={location.map_image_url}
                            initialPins={[]}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#1e1e1e] p-6 rounded-lg border border-neutral-800">
                        <h3 className="font-semibold mb-4">Ustawienia Mapy</h3>

                        {!location.map_image_url ? (
                            <MapUploader locationId={location.id} />
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-green-500 mb-4">Mapa aktywna</p>
                                <MapUploader locationId={location.id} />
                                <p className="text-xs text-neutral-500 mt-2">Wgranie nowego pliku nadpisze obecną mapę</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1e1e1e] p-6 rounded-lg border border-neutral-800 opacity-50 cursor-not-allowed">
                        <h3 className="font-semibold mb-2">Automatyczna Analiza AI</h3>
                        <p className="text-xs text-neutral-400 mb-4">
                            Funkcja analizy zdjęć i szkiców (Gemini) będzie dostępna wkrótce.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
