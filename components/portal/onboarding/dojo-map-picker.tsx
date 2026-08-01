"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapDojo = {
    id: string;
    name: string;
    city?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
};

const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// A red, slightly larger pin for the currently-selected dojo.
const selectedIcon = L.divIcon({
    className: "",
    html: `
        <div style="
            width: 32px; height: 32px; border-radius: 9999px;
            background: #dc2626; border: 3px solid white;
            box-shadow: 0 4px 12px rgba(220,38,38,0.5);
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 14px;
        ">✓</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

type Props = {
    dojos: MapDojo[];
    selectedId: string;
    onSelect: (id: string) => void;
};

function FlyToSelected({
    target,
}: {
    target: { lat: number; lng: number } | null;
}) {
    const map = useMap();
    useEffect(() => {
        if (!target) return;
        map.flyTo([target.lat, target.lng], 15, { duration: 0.8 });
    }, [target, map]);
    return null;
}

export default function DojoMapPicker({ dojos, selectedId, onSelect }: Props) {
    const pinnable = useMemo(
        () =>
            dojos.filter(
                (d) =>
                    typeof d.latitude === "number" &&
                    typeof d.longitude === "number" &&
                    Number.isFinite(d.latitude) &&
                    Number.isFinite(d.longitude),
            ),
        [dojos],
    );

    // Default view: average of all pin coordinates, or Dhaka if none.
    const center = useMemo<[number, number]>(() => {
        if (pinnable.length === 0) return [23.8103, 90.4125]; // Dhaka
        const lat =
            pinnable.reduce((s, d) => s + (d.latitude as number), 0) /
            pinnable.length;
        const lng =
            pinnable.reduce((s, d) => s + (d.longitude as number), 0) /
            pinnable.length;
        return [lat, lng];
    }, [pinnable]);

    const flyTarget = useMemo(() => {
        const hit = pinnable.find((d) => d.id === selectedId);
        if (!hit) return null;
        return { lat: hit.latitude as number, lng: hit.longitude as number };
    }, [pinnable, selectedId]);

    if (pinnable.length === 0) {
        return (
            <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
                No dojos have shared a map location yet. Use the dropdown below.
            </div>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
            <div className="relative h-64 sm:h-80">
                <MapContainer
                    center={center}
                    zoom={7}
                    scrollWheelZoom={false}
                    className="w-full h-full !z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FlyToSelected target={flyTarget} />
                    {pinnable.map((d) => (
                        <Marker
                            key={d.id}
                            position={[d.latitude as number, d.longitude as number]}
                            icon={selectedId === d.id ? selectedIcon : defaultIcon}
                            eventHandlers={{
                                click: () => onSelect(d.id),
                            }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-bold text-zinc-900">{d.name}</p>
                                    {d.city && (
                                        <p className="text-zinc-600 mt-0.5">{d.city}</p>
                                    )}
                                    {d.address && (
                                        <p className="text-zinc-500 mt-1 text-xs">{d.address}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onSelect(d.id)}
                                        className="mt-2 inline-flex items-center gap-1 bg-accent-red text-white text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded hover:bg-accent-red/90"
                                    >
                                        {selectedId === d.id ? "Selected" : "Select this dojo"}
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
            <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Tap a pin to pick your dojo.</span>
                {selectedId && (
                    <span className="font-bold text-zinc-700">
                        {pinnable.find((d) => d.id === selectedId)?.name ?? "Selected"}
                    </span>
                )}
            </div>
        </div>
    );
}
