"use client";

import dynamic from "next/dynamic";
import type { DojoPin } from "./all-dojos-map";

const AllDojosMap = dynamic(() => import("./all-dojos-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] bg-zinc-100 border border-zinc-200 rounded-sm animate-pulse" />
    ),
});

type Props = {
    dojos: DojoPin[];
    height?: number;
    activeDivision?: string | null;
};

export default function AllDojosMapWrapper(props: Props) {
    return <AllDojosMap {...props} />;
}
