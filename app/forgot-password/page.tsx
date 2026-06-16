import type { Metadata } from "next";
import ForgotPasswordClient from "@/components/auth/forgot-password-client";

export const metadata: Metadata = {
    title: "Forgot Password — JKA Bangladesh",
    description: "Reset your JKA Bangladesh member account password.",
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordClient />;
}
