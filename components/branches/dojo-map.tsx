"use client";

import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type Props = {
    latitude: number;
    longitude: number;
    name: string;
    address?: string | null;
    height?: number;
};

export default function DojoMap({ latitude, longitude, name, address, height = 360 }: Props) {
    const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
    return (
        <div
            className="relative isolate w-full rounded-sm overflow-hidden border border-zinc-200"
            style={{ height }}
        >
            <MapContainer
                center={center}
                zoom={15}
                scrollWheelZoom={false}
                className="w-full h-full !z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center} icon={markerIcon}>
                    <Popup>
                        <div className="text-sm">
                            <p className="font-bold text-zinc-900">{name}</p>
                            {address && <p className="text-zinc-600 mt-0.5">{address}</p>}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
