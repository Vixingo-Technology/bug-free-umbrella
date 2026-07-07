"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Save } from "lucide-react";
import { saveDojoLocationAction } from "@/app/portal/dojo/settings/actions";

const DojoLocationPicker = dynamic(
    () => import("@/components/dojo-location-picker"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-80 rounded-sm border border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs tracking-widest uppercase font-bold text-zinc-400">
                Loading map…
            </div>
        ),
    }
);

type Props = {
    initialAddress: string;
    initialLatitude: string;
    initialLongitude: string;
};

export default function LocationEditor({
    initialAddress,
    initialLatitude,
    initialLongitude,
}: Props) {
    const [address, setAddress] = useState(initialAddress);
    const [latitude, setLatitude] = useState(initialLatitude);
    const [longitude, setLongitude] = useState(initialLongitude);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();

    function handlePickerChange(lat: string, lng: string) {
        setLatitude(lat);
        setLongitude(lng);
        setSaved(false);
    }

    function onSave() {
        setError(null);
        setSaved(false);

        const lat = latitude.trim() === "" ? null : parseFloat(latitude);
        const lng = longitude.trim() === "" ? null : parseFloat(longitude);

        if (lat !== null && !Number.isFinite(lat)) {
            setError("Latitude must be a number.");
            return;
        }
        if (lng !== null && !Number.isFinite(lng)) {
            setError("Longitude must be a number.");
            return;
        }
        if (lat !== null && (lat < -90 || lat > 90)) {
            setError("Latitude must be between -90 and 90.");
            return;
        }
        if (lng !== null && (lng < -180 || lng > 180)) {
            setError("Longitude must be between -180 and 180.");
            return;
        }

        startTransition(async () => {
            const res = await saveDojoLocationAction({
                address: address.trim() || null,
                latitude: lat,
                longitude: lng,
            });
            if ("error" in res) {
                setError(res.error);
            } else {
                setSaved(true);
            }
        });
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                    Address
                </label>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                        setAddress(e.target.value);
                        setSaved(false);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                        Latitude
                    </label>
                    <input
                        type="text"
                        value={latitude}
                        onChange={(e) => {
                            setLatitude(e.target.value);
                            setSaved(false);
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </div>
                <div>
                    <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                        Longitude
                    </label>
                    <input
                        type="text"
                        value={longitude}
                        onChange={(e) => {
                            setLongitude(e.target.value);
                            setSaved(false);
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </div>
            </div>

            <DojoLocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handlePickerChange}
            />

            <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                    {error && (
                        <p className="flex items-center gap-1.5 text-red-600">
                            <AlertCircle size={12} /> {error}
                        </p>
                    )}
                    {saved && !error && (
                        <p className="flex items-center gap-1.5 text-emerald-600">
                            <Check size={12} /> Location saved
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={pending}
                    className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 transition-colors rounded-sm"
                >
                    {pending ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Save size={12} />
                    )}
                    Save location
                </button>
            </div>
        </div>
    );
}
