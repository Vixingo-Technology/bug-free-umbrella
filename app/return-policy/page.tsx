import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
    title: "Return Policy — JKA Bangladesh",
    description:
        "Conditions, timeframes, and process for returning merchandise purchased from JKA Bangladesh.",
};

export default function ReturnPolicyPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 pb-16 border-b border-zinc-200 bg-bg-charcoal">
                <div className="max-w-4xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Legal
                    </p>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
                        Return &amp; Refund Policy
                    </h1>
                    <p className="text-zinc-600 text-sm">
                        Last updated: June 23, 2026
                    </p>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-10 text-zinc-700 leading-relaxed">
                    <p>
                        We want every member to be satisfied with their
                        purchase from JKA Bangladesh. This Return &amp; Refund
                        Policy explains when and how you can return items
                        purchased from our shop and the conditions under which
                        membership, grading, and event fees may be refunded.
                    </p>

                    <Section title="1. Eligibility for Return">
                        <p>
                            You may return a physical merchandise item
                            (uniforms, belts, training equipment, etc.) within{" "}
                            <strong>7 days</strong> of delivery if it meets all
                            of the following conditions:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                The item is unused, unwashed, and in its
                                original condition.
                            </li>
                            <li>
                                All original tags, packaging, and accessories
                                are intact.
                            </li>
                            <li>
                                You can provide the original order number or
                                receipt.
                            </li>
                        </ul>
                    </Section>

                    <Section title="2. Non-Returnable Items">
                        <p>The following are not eligible for return:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                Personalized or embroidered items (e.g.,
                                belts with the member&apos;s name embroidered
                                on them).
                            </li>
                            <li>
                                Used or washed uniforms (gi), mouthguards, or
                                any item that comes into close personal
                                contact with the body for hygiene reasons.
                            </li>
                            <li>
                                Digital certificates, downloadable resources,
                                and digital membership cards.
                            </li>
                            <li>
                                Membership fees, grading fees, and event
                                registration fees once the service has
                                commenced (see Section 5).
                            </li>
                            <li>Items marked &ldquo;Final Sale.&rdquo;</li>
                        </ul>
                    </Section>

                    <Section title="3. Damaged, Defective, or Wrong Items">
                        <p>
                            If you receive a damaged, defective, or incorrect
                            item, please contact us within{" "}
                            <strong>48 hours</strong> of delivery with photos
                            of the item and the packaging. We will arrange a
                            free replacement or a full refund — whichever you
                            prefer.
                        </p>
                    </Section>

                    <Section title="4. How to Initiate a Return">
                        <ol className="list-decimal pl-6 space-y-2">
                            <li>
                                Email us at{" "}
                                <a
                                    href="mailto:info@jkabangladesh.com"
                                    className="text-accent-red hover:underline"
                                >
                                    info@jkabangladesh.com
                                </a>{" "}
                                with your order number, the item you wish to
                                return, and the reason.
                            </li>
                            <li>
                                Wait for our confirmation and return
                                instructions (typically within 2 business
                                days).
                            </li>
                            <li>
                                Ship the item back, or drop it off at the JKA
                                Bangladesh headquarters in Dhaka. Return
                                shipping costs are borne by the customer
                                unless the item was damaged, defective, or
                                wrong.
                            </li>
                            <li>
                                Once we receive and inspect the item, we will
                                process your refund or exchange.
                            </li>
                        </ol>
                    </Section>

                    <Section title="5. Membership, Grading &amp; Event Refunds">
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Membership fees</strong> are
                                non-refundable once the membership period has
                                begun, except where required by law.
                            </li>
                            <li>
                                <strong>Grading fees</strong> are refundable
                                only if you withdraw at least 7 days before
                                the grading date. After this point, fees are
                                non-refundable.
                            </li>
                            <li>
                                <strong>Event &amp; tournament fees</strong>{" "}
                                follow the cancellation rules published on the
                                respective event page. In general, full
                                refunds are issued for cancellations made 14+
                                days before the event; partial refunds for
                                7–13 days; no refunds within 7 days.
                            </li>
                            <li>
                                If an event, grading, or training program is
                                cancelled by JKA Bangladesh, you will receive
                                a full refund or the option to credit the
                                amount toward a future event.
                            </li>
                        </ul>
                    </Section>

                    <Section title="6. Refund Processing">
                        <p>
                            Approved refunds are credited back to the original
                            payment method:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                <strong>bKash / Nagad / Mobile Banking:</strong>{" "}
                                3–5 business days.
                            </li>
                            <li>
                                <strong>SSLCommerz / Card Payments:</strong>{" "}
                                5–10 business days, depending on your bank.
                            </li>
                            <li>
                                <strong>Stripe / International Cards:</strong>{" "}
                                5–14 business days.
                            </li>
                        </ul>
                        <p className="mt-3">
                            Refunds will reflect the actual amount paid
                            excluding any non-refundable payment-gateway
                            charges.
                        </p>
                    </Section>

                    <Section title="7. Exchanges">
                        <p>
                            If you wish to exchange an item for a different
                            size or model, follow the return process above and
                            place a new order for the replacement item.
                            Exchanges are subject to product availability.
                        </p>
                    </Section>

                    <Section title="8. Contact Us">
                        <p>
                            Questions about returns or refunds? We&apos;re
                            here to help.
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
