import Image from "next/image";
import Logo from "@/assets/jka_logo.svg";

export default function RootLoading() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-deep gap-6">
            <div className="relative">
                <div className="absolute inset-0 rounded-full bg-accent-red/10 blur-2xl animate-pulse" />
                <Image
                    src={Logo}
                    alt="JKA Bangladesh"
                    width={64}
                    height={64}
                    priority
                    className="relative animate-pulse"
                />
            </div>
            <div className="flex flex-col items-center gap-3">
                <span className="font-karate font-bold text-zinc-900 tracking-[0.4em] text-[10px]">
                    JKA <span className="text-accent-red">BANGLADESH</span>
                </span>
                <div className="h-[2px] w-32 overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full w-1/3 bg-accent-red animate-[loader_1.2s_ease-in-out_infinite]" />
                </div>
            </div>
            <style>{`
                @keyframes loader {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
}
