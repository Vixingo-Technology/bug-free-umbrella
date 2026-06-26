"use client";

import dynamic from "next/dynamic";

const DojoMap = dynamic(() => import("./dojo-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[360px] bg-zinc-100 border border-zinc-200 rounded-sm animate-pulse" />
    ),
});

type Props = {
    latitude: number;
    longitude: number;
    name: string;
    address?: string | null;
    height?: number;
};

export default function DojoMapWrapper(props: Props) {
    return <DojoMap {...props} />;
}
