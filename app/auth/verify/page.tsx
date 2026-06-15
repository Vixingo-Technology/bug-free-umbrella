import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";

export const metadata = {
    title: "Verify Your Email — JKA Bangladesh",
};

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-charcoal relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md p-6 relative z-10 text-center">
                <div className="glass p-10 rounded-2xl shadow-xl">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <Image src={Logo} alt="JKA Logo" width={56} height={56} />
                        <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center">
                            <Mail size={28} className="text-accent-red" />
                        </div>
                    </div>

                    <h1 className="font-serif text-2xl font-bold text-zinc-900 mb-3">
                        Check Your Email
                    </h1>
                    <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                        We sent a confirmation link to your email address.
                        Click the link to verify your account and access the member portal.
                    </p>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-500 mb-8">
                        Didn&apos;t receive it? Check your spam folder, or{" "}
                        <Link href="/signup" className="text-accent-red font-semibold hover:underline">
                            try signing up again
                        </Link>
                        .
                    </div>

                    <Link
                        href="/login"
                        className="text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-accent-red transition-colors"
                    >
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
