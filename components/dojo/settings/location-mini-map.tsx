"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type Props = {
    latitude: number;
    longitude: number;
};

export default function LocationMiniMap({ latitude, longitude }: Props) {
    const center: [number, number] = [latitude, longitude];
    return (
        <div className="relative isolate z-0 w-full h-40 rounded-sm overflow-hidden border border-zinc-200">
            <MapContainer
                center={center}
                zoom={15}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={false}
                touchZoom={false}
                boxZoom={false}
                keyboard={false}
                attributionControl={false}
                className="w-full h-full"
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={center} icon={markerIcon} />
            </MapContainer>
        </div>
    );
}
