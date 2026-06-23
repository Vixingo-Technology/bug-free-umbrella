"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default marker icon URLs (Webpack/Next bundler can't resolve them).
const markerIcon = L.icon({
    iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const DHAKA_CENTER: [number, number] = [23.7806, 90.4193];

type Props = {
    latitude: string;
    longitude: string;
    onChange: (lat: string, lng: string) => void;
};

export default function DojoLocationPicker({
    latitude,
    longitude,
    onChange,
}: Props) {
    const parsed = useMemo(() => {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return [lat, lng] as [number, number];
        }
        return null;
    }, [latitude, longitude]);

    const center = parsed ?? DHAKA_CENTER;

    function handlePick(lat: number, lng: number) {
        onChange(lat.toFixed(6), lng.toFixed(6));
    }

    function useMyLocation() {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
            () => {
                /* user denied */
            }
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative w-full h-80 rounded-sm overflow-hidden border border-zinc-200">
                <MapContainer
                    center={center}
                    zoom={parsed ? 15 : 11}
                    scrollWheelZoom={true}
                    className="w-full h-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickToPlace onPlace={handlePick} />
                    <RecenterOnChange center={parsed} />
                    {parsed && (
                        <Marker
                            position={parsed}
                            icon={markerIcon}
                            draggable
                            eventHandlers={{
                                dragend: (e) => {
                                    const m = e.target as L.Marker;
                                    const ll = m.getLatLng();
                                    handlePick(ll.lat, ll.lng);
                                },
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <span>
                    Click the map to drop a pin, then drag the pin to fine-tune.
                </span>
                <button
                    type="button"
                    onClick={useMyLocation}
                    className="inline-flex items-center gap-1.5 text-accent-red font-bold tracking-widest uppercase hover:text-accent-red/80 transition-colors"
                >
                    Use my current location
                </button>
            </div>
        </div>
    );
}

function ClickToPlace({
    onPlace,
}: {
    onPlace: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onPlace(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function RecenterOnChange({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, Math.max(map.getZoom(), 14), { animate: true });
        }
    }, [center, map]);
    return null;
}
