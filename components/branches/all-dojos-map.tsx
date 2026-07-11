"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type DojoPin = {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    latitude: number;
    longitude: number;
};

type Props = {
    dojos: DojoPin[];
    height?: number;
    activeDivision?: string | null;
};

const markerIcon = L.divIcon({
    className: "jka-dojo-marker",
    html: `
        <div style="
            position: relative;
            width: 28px;
            height: 28px;
            transform: translate(-14px, -28px);
        ">
            <div style="
                position: absolute;
                inset: 0;
                border-radius: 9999px;
                background: rgba(220, 38, 38, 0.25);
                animation: jka-pulse 2s ease-out infinite;
            "></div>
            <div style="
                position: absolute;
                top: 4px;
                left: 4px;
                width: 20px;
                height: 20px;
                border-radius: 9999px;
                background: #dc2626;
                border: 3px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            "></div>
        </div>
        <style>
            @keyframes jka-pulse {
                0% { transform: scale(0.8); opacity: 0.9; }
                100% { transform: scale(2.4); opacity: 0; }
            }
        </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
});

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];

function FitToPins({
    pins,
    activeDivision,
}: {
    pins: DojoPin[];
    activeDivision?: string | null;
}) {
    const map = useMap();
    useEffect(() => {
        if (pins.length === 0) {
            map.setView(BANGLADESH_CENTER, 7, { animate: true });
            return;
        }
        if (pins.length === 1) {
            map.setView([pins[0].latitude, pins[0].longitude], 13, {
                animate: true,
            });
            return;
        }
        const bounds = L.latLngBounds(
            pins.map((p) => [p.latitude, p.longitude] as [number, number]),
        );
        map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 });
    }, [map, pins, activeDivision]);
    return null;
}

export default function AllDojosMap({
    dojos,
    height = 500,
    activeDivision = null,
}: Props) {
    const pins = useMemo(
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

    return (
        <div
            className={`relative isolate w-full rounded-sm overflow-hidden border shadow-md transition-colors ${
                activeDivision ? "border-accent-red" : "border-zinc-200"
            }`}
            style={{ height }}
        >
            {activeDivision && (
                <div className="absolute top-3 right-3 z-[400] bg-accent-red text-white text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-sm shadow-md">
                    {activeDivision} · {pins.length}{" "}
                    {pins.length === 1 ? "dojo" : "dojos"}
                </div>
            )}
            <MapContainer
                center={BANGLADESH_CENTER}
                zoom={7}
                scrollWheelZoom={false}
                className="w-full h-full !z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitToPins pins={pins} activeDivision={activeDivision} />
                {pins.map((d) => (
                    <Marker
                        key={d.id}
                        position={[d.latitude, d.longitude]}
                        icon={markerIcon}
                    >
                        <Popup>
                            <div className="text-sm min-w-[180px]">
                                <p className="font-bold text-zinc-900 leading-tight">
                                    {d.name}
                                </p>
                                {d.city && (
                                    <p className="text-[10px] tracking-widest uppercase text-accent-red font-bold mt-1">
                                        {d.city}
                                    </p>
                                )}
                                {d.address && (
                                    <p className="text-zinc-600 mt-1 leading-snug">
                                        {d.address}
                                    </p>
                                )}
                                <Link
                                    href={`/branches/${d.id}`}
                                    className="inline-block mt-2 text-xs font-bold tracking-widest uppercase text-accent-red hover:underline"
                                >
                                    View branch →
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
