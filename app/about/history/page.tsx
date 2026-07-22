import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "History | JKA Bangladesh",
};

export default function HistoryPage() {
    return (
        <div className="prose prose-zinc max-w-none prose-headings:font-karate prose-h1:text-4xl prose-h1:mb-6 prose-h1:text-zinc-900 prose-h2:text-2xl prose-h2:text-zinc-800 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-zinc-700 prose-p:leading-relaxed">
            {/* Section 1: Origins */}
            <section id="origins" className="scroll-mt-28">
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4 font-sans">
                    History
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    The Origins of the{" "}
                    <span className="text-accent-red italic">
                        Japan Karate Association
                    </span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
                
                <div className="space-y-6 text-lg text-zinc-700 leading-relaxed max-w-3xl font-sans">
                    <p>
                        Karate traces its roots to the ancient martial traditions of Okinawa, where an indigenous method of self-defence known as Te (&quot;Hand&quot;) gradually evolved over centuries. Because Okinawa maintained close cultural and commercial ties with China, the art was influenced by Chinese martial systems, eventually developing into what became known as Kara-Te.
                    </p>
                    <p>
                        Although the exact origins of karate cannot be determined with certainty due to the absence of contemporary written records, historians generally believe its development accelerated around the 15th century. During this period, King Shō Hashi unified Okinawa and prohibited the possession of weapons. Similar restrictions were later imposed after the Satsuma clan brought Okinawa under Japanese rule in the early 17th century. These circumstances encouraged the refinement of effective unarmed self-defence techniques, which were taught discreetly and preserved through generations.
                    </p>
                    <p>
                        A defining chapter in karate&apos;s history began with the birth of Gichin Funakoshi (1868–1957), widely regarded as the father of modern karate. Through his lifelong dedication, he introduced Okinawan karate to mainland Japan and transformed it into a disciplined martial way that emphasized character, respect, and self-improvement alongside physical training.
                    </p>
                    <p>
                        As interest in karate grew across Japan, numerous university and institutional karate clubs were established during the 1930s, helping the art gain national recognition. However, the outbreak of the Second World War temporarily interrupted its development as many practitioners joined the war effort.
                    </p>
                    <p>
                        Following the war, karate experienced a remarkable revival. It became an important part of Japan&apos;s martial culture and was increasingly incorporated into educational and community programmes. To promote and preserve the highest standards of traditional karate, the Japan Karate Association (JKA) was formally established in 1949.
                    </p>
                    <p>
                        Master Gichin Funakoshi was appointed Honorary Chief Instructor, while Masatoshi Nakayama assumed responsibility for technical instruction and Hidetaka Nishiyama led the instructional committee. Under their leadership, the JKA developed a systematic training curriculum, instructor education programme, and international grading system that laid the foundation for the worldwide spread of traditional Shotokan Karate.
                    </p>
                    <p>
                        Master Funakoshi passed away on 26 April 1957. His enduring philosophy is reflected in the famous inscription on his memorial:
                    </p>
                    <div className="bg-zinc-50 border-l-4 border-accent-red p-6 my-6 font-serif italic text-xl text-zinc-900 rounded-r-lg shadow-sm">
                        &quot;Karate ni sente nashi&quot; — &quot;There is no first attack in karate.&quot;
                    </div>
                    <p>
                        Today, the Japan Karate Association World Federation (JKA WF) unites official branches and member organisations in approximately 130 countries. It is internationally respected as one of the foremost authorities dedicated to preserving and promoting authentic traditional Shotokan Karate-Do.
                    </p>
                </div>
            </section>

            {/* Section 2: About JKA Bangladesh */}
            <section id="jka-bangladesh" className="scroll-mt-28 mt-16 pt-16 border-t border-zinc-200">
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4 font-sans">
                    JKA WF Bangladesh
                </p>
                <h2 className="font-karate text-3xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    About JKA WF{" "}
                    <span className="text-accent-red italic">Bangladesh</span>
                </h2>
                <div className="h-px w-24 bg-accent-red mb-8" />
                
                <div className="space-y-6 text-lg text-zinc-700 leading-relaxed max-w-3xl font-sans">
                    <p>
                        Japan Karate Association World Federation Bangladesh (JKA WF Bangladesh) is a non-profit organisation committed to promoting authentic traditional Shotokan Karate throughout Bangladesh. Headquartered in Chattogram, with its capital office in Dhaka and affiliated clubs across the country, the organisation operates under the technical guidance and standards of the Japan Karate Association World Federation (JKA WF), Japan.
                    </p>
                    <p>
                        A historic milestone was achieved in 2015 when Bangladesh received its first official JKA WF Country Licence—the first recognition of its kind in the nation&apos;s history. The licence was formally presented at the JKA WF Headquarters in Tokyo, where Sensei Tulu Ush Shams, Country Representative, led the Bangladesh delegation. He was accompanied by Sensei Imtiaz Salim during the official licensing ceremony.
                    </p>
                    <p>
                        Today, Sensei Tulu Ush Shams serves as the Country Representative and Chief Technical Director of JKA WF Bangladesh. Working alongside the Executive Committee and Technical Committee, he oversees the organisation&apos;s administration, instructor development, grading standards, and technical excellence in accordance with JKA WF Japan.
                    </p>
                    <p>
                        With affiliated dojos and training centres established across Bangladesh, JKA WF Bangladesh continues to expand opportunities for people of all ages to study traditional Shotokan Karate under internationally recognised standards. Whether you are a beginner or an experienced practitioner, you can become part of a community dedicated to lifelong learning, discipline, and the true spirit of Karate-Do.
                    </p>
                </div>
            </section>
        </div>
    );
}
