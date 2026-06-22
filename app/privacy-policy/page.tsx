import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
    title: "Privacy Policy — JKA Bangladesh",
    description:
        "How Japan Karate Association Bangladesh collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 pb-16 border-b border-zinc-200 bg-bg-charcoal">
                <div className="max-w-4xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Legal
                    </p>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-zinc-600 text-sm">
                        Last updated: June 23, 2026
                    </p>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-10 text-zinc-700 leading-relaxed">
                    <div>
                        <p>
                            Japan Karate Association Bangladesh (&ldquo;JKA
                            Bangladesh,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
                            or &ldquo;our&rdquo;) is committed to protecting the
                            privacy of our members, students, instructors, and
                            visitors. This Privacy Policy explains what
                            information we collect, how we use it, and the
                            rights you have over your data when you use{" "}
                            <span className="font-medium text-zinc-900">
                                jkabangladesh.com
                            </span>{" "}
                            and our member portal.
                        </p>
                    </div>

                    <Section title="1. Information We Collect">
                        <p>We collect the following categories of information:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                <strong>Identity &amp; Contact Information:</strong>{" "}
                                full name, date of birth, gender, photograph,
                                national ID (where applicable), phone number,
                                email address, and home address.
                            </li>
                            <li>
                                <strong>Membership &amp; Training Records:</strong>{" "}
                                dojo affiliation, belt rank, grading history,
                                attendance, tournament participation, and
                                certificates issued.
                            </li>
                            <li>
                                <strong>Payment Information:</strong> transaction
                                IDs and payment status for membership fees,
                                gradings, events, and shop purchases. Card and
                                mobile-banking credentials are processed
                                directly by SSLCommerz, bKash, Nagad, or
                                Stripe — we do not store them.
                            </li>
                            <li>
                                <strong>Technical Data:</strong> IP address,
                                device and browser type, language preference,
                                and basic usage analytics.
                            </li>
                        </ul>
                    </Section>

                    <Section title="2. How We Use Your Information">
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                Manage memberships, gradings, certificates,
                                and tournament registrations.
                            </li>
                            <li>
                                Process payments and issue digital membership
                                cards and receipts.
                            </li>
                            <li>
                                Send important notifications via WhatsApp,
                                email, or SMS — including grading reminders,
                                renewal notices, and event updates.
                            </li>
                            <li>
                                Verify identity, prevent fraud, and enforce
                                our terms.
                            </li>
                            <li>
                                Improve our website, services, and training
                                programs.
                            </li>
                        </ul>
                    </Section>

                    <Section title="3. Legal Basis for Processing">
                        <p>
                            We process your personal data based on (a) your
                            consent at registration, (b) the contract between
                            you and JKA Bangladesh as a member, (c) our
                            legitimate interest in operating a national karate
                            organization, and (d) compliance with applicable
                            Bangladeshi law.
                        </p>
                    </Section>

                    <Section title="4. Sharing of Information">
                        <p>
                            We do not sell your personal information. We share
                            it only with:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                Authorized JKA Bangladesh staff, instructors,
                                and dojo heads — limited to what is needed for
                                their role.
                            </li>
                            <li>
                                Payment processors (SSLCommerz, bKash, Nagad,
                                Stripe) to complete transactions.
                            </li>
                            <li>
                                Service providers we rely on, including
                                Supabase (hosting and database), Cloudinary
                                (media storage), and our automation provider
                                for notifications.
                            </li>
                            <li>
                                JKA World Federation, when required for
                                international rank certification or tournament
                                participation.
                            </li>
                            <li>
                                Government or law enforcement authorities when
                                legally required.
                            </li>
                        </ul>
                    </Section>

                    <Section title="5. Data Retention">
                        <p>
                            Membership and grading records are retained for as
                            long as you remain a member and for a reasonable
                            period afterwards to maintain historical rank and
                            certification records. Financial records are kept
                            for the period required by applicable tax and
                            accounting law.
                        </p>
                    </Section>

                    <Section title="6. Security">
                        <p>
                            We use industry-standard safeguards including
                            encrypted connections (HTTPS), database-level
                            row-level security, hashed credentials, and
                            role-based access controls. No system is
                            completely secure; please choose a strong password
                            and notify us immediately of any suspected
                            unauthorized access to your account.
                        </p>
                    </Section>

                    <Section title="7. Your Rights">
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                Access the personal data we hold about you.
                            </li>
                            <li>
                                Request correction of inaccurate or incomplete
                                data.
                            </li>
                            <li>
                                Request deletion of your account, subject to
                                our obligation to retain certain rank,
                                certification, and financial records.
                            </li>
                            <li>
                                Withdraw consent for non-essential
                                communications at any time.
                            </li>
                        </ul>
                        <p className="mt-3">
                            To exercise any of these rights, contact us at the
                            email below.
                        </p>
                    </Section>

                    <Section title="8. Children's Privacy">
                        <p>
                            Members under 18 must be registered by a parent or
                            legal guardian, who is responsible for consenting
                            to this Privacy Policy on the minor&apos;s behalf.
                        </p>
                    </Section>

                    <Section title="9. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to
                            time. The &ldquo;Last updated&rdquo; date at the
                            top of this page reflects the latest revision.
                            Continued use of our services after changes are
                            posted constitutes acceptance of the updated
                            policy.
                        </p>
                    </Section>

                    <Section title="10. Contact Us">
                        <p>
                            For any privacy-related questions or requests,
                            please contact:
                        </p>
                        <div className="mt-3 p-5 bg-bg-charcoal rounded-lg border border-zinc-200">
                            <p className="font-medium text-zinc-900">
                                Japan Karate Association Bangladesh
                            </p>
                            <p>National Sports Council, 62/3 Purana Paltan</p>
                            <p>Dhaka, Bangladesh</p>
                            <p className="mt-2">
                                Email:{" "}
                                <a
                                    href="mailto:info@jkabangladesh.com"
                                    className="text-accent-red hover:underline"
                                >
                                    info@jkabangladesh.com
                                </a>
                            </p>
                            <p>Phone: +880 1234 567890</p>
                        </div>
                    </Section>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
                {title}
            </h2>
            <div className="space-y-3">{children}</div>
        </div>
    );
}
