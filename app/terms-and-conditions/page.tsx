import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
    title: "Terms and Conditions — JKA Bangladesh",
    description:
        "The rules and obligations that govern your use of the JKA Bangladesh website, member portal, and services.",
};

export default function TermsAndConditionsPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 pb-16 border-b border-zinc-200 bg-bg-charcoal">
                <div className="max-w-4xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Legal
                    </p>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
                        Terms and Conditions
                    </h1>
                    <p className="text-zinc-600 text-sm">
                        Last updated: June 23, 2026
                    </p>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-10 text-zinc-700 leading-relaxed">
                    <p>
                        These Terms and Conditions (&ldquo;Terms&rdquo;) govern
                        your access to and use of the Japan Karate Association
                        Bangladesh website (
                        <span className="font-medium text-zinc-900">
                            jkabangladesh.com
                        </span>
                        ), member portal, dojo network, and related services
                        (collectively, the &ldquo;Services&rdquo;). By creating
                        an account, joining a dojo, registering for an event,
                        or making a purchase, you agree to be bound by these
                        Terms.
                    </p>

                    <Section title="1. Eligibility">
                        <p>
                            You must be at least 5 years of age to train with
                            JKA Bangladesh. Members under 18 must be enrolled
                            and supervised by a parent or legal guardian, who
                            accepts these Terms on the minor&apos;s behalf.
                        </p>
                    </Section>

                    <Section title="2. Membership">
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                Membership is granted upon completion of
                                registration, payment of applicable fees, and
                                approval by JKA Bangladesh.
                            </li>
                            <li>
                                Membership is personal and non-transferable.
                            </li>
                            <li>
                                Members must follow the Dojo Kun, instructions
                                of their instructors, and the rules of their
                                assigned dojo.
                            </li>
                            <li>
                                We reserve the right to suspend or terminate
                                membership for misconduct, non-payment, or
                                conduct contrary to the values of JKA.
                            </li>
                        </ul>
                    </Section>

                    <Section title="3. Account Security">
                        <p>
                            You are responsible for maintaining the
                            confidentiality of your account credentials and
                            for all activity that occurs under your account.
                            Notify us immediately of any unauthorized use.
                        </p>
                    </Section>

                    <Section title="4. Training Risk &amp; Liability">
                        <p>
                            Karate is a physical contact martial art. Training,
                            gradings, and tournaments involve inherent risks
                            of injury. By participating you acknowledge these
                            risks and agree that JKA Bangladesh, its
                            instructors, and dojo heads shall not be liable
                            for injuries sustained during normal training,
                            grading, or competition, except in cases of gross
                            negligence.
                        </p>
                        <p className="mt-3">
                            Members are responsible for ensuring they are
                            medically fit to train and must disclose any
                            health conditions to their instructor before
                            participating.
                        </p>
                    </Section>

                    <Section title="5. Gradings &amp; Certifications">
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                Belt promotions are awarded only by authorized
                                JKA examiners and at the sole discretion of
                                the examination panel.
                            </li>
                            <li>
                                Grading fees are non-refundable once the
                                grading has commenced.
                            </li>
                            <li>
                                Certificates issued by JKA Bangladesh are the
                                property of the holder but their validity
                                depends on the holder remaining a member in
                                good standing.
                            </li>
                        </ul>
                    </Section>

                    <Section title="6. Payments &amp; Fees">
                        <p>
                            All fees (membership, grading, events, shop
                            purchases) are payable in advance through our
                            approved payment channels: SSLCommerz, bKash,
                            Nagad, or Stripe. Prices are listed in Bangladeshi
                            Taka (BDT) unless otherwise stated and may change
                            from time to time.
                        </p>
                    </Section>

                    <Section title="7. Shop &amp; Merchandise">
                        <p>
                            Purchases of merchandise (gi, belts, equipment,
                            etc.) through our shop are subject to product
                            availability and our{" "}
                            <a
                                href="/return-policy"
                                className="text-accent-red hover:underline"
                            >
                                Return Policy
                            </a>
                            . We make every effort to display product images
                            and descriptions accurately but cannot guarantee
                            that your device displays colors exactly.
                        </p>
                    </Section>

                    <Section title="8. Intellectual Property">
                        <p>
                            All content on this website — including text,
                            images, logos, the JKA Bangladesh name and crest,
                            videos, and the dojo network database — is the
                            property of JKA Bangladesh or its licensors and is
                            protected by copyright and trademark law. You may
                            not reproduce, distribute, or create derivative
                            works without our prior written permission.
                        </p>
                    </Section>

                    <Section title="9. Conduct on the Platform">
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li>
                                Use the Services for unlawful or fraudulent
                                purposes.
                            </li>
                            <li>
                                Attempt to access another member&apos;s
                                account or data.
                            </li>
                            <li>
                                Upload viruses, malware, or any code designed
                                to disrupt the Services.
                            </li>
                            <li>
                                Misrepresent your identity, rank, or
                                affiliation with JKA.
                            </li>
                            <li>
                                Use scraping, bots, or other automated means
                                to extract data from the platform.
                            </li>
                        </ul>
                    </Section>

                    <Section title="10. Termination">
                        <p>
                            We may suspend or terminate your account or
                            membership at any time if you breach these Terms,
                            engage in conduct harmful to other members, or
                            bring the reputation of JKA into disrepute.
                            Termination does not entitle you to a refund of
                            fees already paid.
                        </p>
                    </Section>

                    <Section title="11. Disclaimers">
                        <p>
                            The Services are provided &ldquo;as is&rdquo; and
                            &ldquo;as available.&rdquo; To the maximum extent
                            permitted by law, we disclaim all warranties,
                            express or implied, regarding the operation of
                            the website, accuracy of information, or
                            uninterrupted availability.
                        </p>
                    </Section>

                    <Section title="12. Limitation of Liability">
                        <p>
                            To the maximum extent permitted by law, JKA
                            Bangladesh shall not be liable for any indirect,
                            incidental, special, or consequential damages
                            arising from your use of the Services. Our total
                            liability for any direct claim shall not exceed
                            the amount you have paid us in the twelve months
                            preceding the claim.
                        </p>
                    </Section>

                    <Section title="13. Governing Law">
                        <p>
                            These Terms are governed by the laws of the
                            People&apos;s Republic of Bangladesh. Any dispute
                            arising out of or in connection with these Terms
                            shall be subject to the exclusive jurisdiction of
                            the courts of Dhaka.
                        </p>
                    </Section>

                    <Section title="14. Changes to These Terms">
                        <p>
                            We may modify these Terms at any time. Material
                            changes will be communicated via email or through
                            the member portal. Continued use of the Services
                            after changes are posted constitutes acceptance of
                            the revised Terms.
                        </p>
                    </Section>

                    <Section title="15. Contact">
                        <div className="p-5 bg-bg-charcoal rounded-lg border border-zinc-200">
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
