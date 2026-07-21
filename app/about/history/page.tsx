import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "History | JKA Bangladesh",
};

export default function HistoryPage() {
    return (
        <div className="prose prose-zinc max-w-none prose-headings:font-karate prose-h1:text-4xl prose-h1:mb-6 prose-h1:text-zinc-900 prose-h2:text-2xl prose-h2:text-zinc-800 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-zinc-700 prose-p:leading-relaxed">
            <section>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                    History
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    The Origins of the
                    {" "}
                    <span className="text-accent-red italic">
                        Japan Karate Association
                    </span>{" "}
                </h1>
                <div className="h-px w-24 bg-accent-red mb-6" />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Karate traces its roots to the ancient martial traditions of
                    Okinawa, where an indigenous method of self-defence known as Te
                    ("Hand") gradually evolved over centuries. Because Okinawa
                    maintained close cultural and commercial ties with China, the
                    art was influenced by Chinese martial systems, eventually
                    developing into what became known as Kara-Te.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Although the exact origins of karate cannot be determined with
                    certainty due to the absence of contemporary written records,
                    historians generally believe its development accelerated around
                    the 15th century. During this period, King Shō Hashi unified
                    Okinawa and prohibited the possession of weapons. Similar
                    restrictions were later imposed after the Satsuma clan brought
                    Okinawa under Japanese rule in the early 17th century. These
                    circumstances encouraged the refinement of effective unarmed
                    self-defence techniques, which were taught discreetly and
                    preserved through generations.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    A defining chapter in karate's history began with the birth of
                    Gichin Funakoshi (1868–1957), widely regarded as the father of
                    modern karate. Through his lifelong dedication, he introduced
                    Okinawan karate to mainland Japan and transformed it into a
                    disciplined martial way that emphasized character, respect, and
                    self-improvement alongside physical training.

                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    As interest in karate grew across Japan, numerous university
                    and institutional karate clubs were established during the 1930s,
                    helping the art gain national recognition. However, the outbreak of
                    the Second World War temporarily interrupted its development as many
                    practitioners joined the war effort.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Following the war, karate experienced a remarkable revival. It
                    became an important part of Japan's martial culture and was
                    increasingly incorporated into educational and community
                    programmes. To promote and preserve the highest standards of
                    traditional karate, the Japan Karate Association (JKA) was
                    formally established in 1949.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Master Gichin Funakoshi was appointed Honorary Chief
                    Instructor, while Masatoshi Nakayama assumed responsibility for
                    technical instruction and Hidetaka Nishiyama led the instructional
                    committee. Under their leadership, the JKA developed a
                    systematic training curriculum, instructor education programme,
                    and international grading system that laid the foundation for
                    the worldwide spread of traditional Shotokan Karate.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Master Funakoshi passed away on 26 April 1957. His enduring
                    philosophy is reflected in the famous inscription on his
                    memorial:
                </p>
                <p className="italic text-lg text-zinc-900 mt-2 block font-semibold">
                    &quot;Karate ni sente nashi&quot;
                </p>
                <p className="text-sm text-zinc-700 leading-relaxed max-w-3xl">
                    - There is no first attack in karate.
                </p>
                <br />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    Today, the Japan Karate Association World Federation (JKA WF)
                    unites official branches and member organisations in
                    approximately 130 countries. It is internationally respected as
                    one of the foremost authorities dedicated to preserving and
                    promoting authentic traditional Shotokan Karate-Do.
                </p>
                <br />
            </section>
            <h1></h1>








        </div>
    );
}
