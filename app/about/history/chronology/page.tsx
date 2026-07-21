import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chronology | JKA Bangladesh",
  description:
    "Key historical milestones and chronology of the Japan Karate Association (JKA).",
};

type TimelineEvent = {
  date: string;
  year: string;
  title: string;
  description: string;
};

const chronologyEvents: TimelineEvent[] = [
  {
    date: "November, 1948",
    year: "1948",
    title: "JKA Founded & Funakoshi Gichin Inaugurated",
    description:
      "The Japan Karate Association was founded and Funakoshi Gichin was Inaugurated as the supreme master.",
  },
  {
    date: "March 20, 1955",
    year: "1955",
    title: "Headquarters Dojo Established",
    description:
      "The Japan Karate Association established its headquarters dojo in Yotsuya, Shinjuku, Tokyo.",
  },
  {
    date: "April, 1956",
    year: "1956",
    title: "Trainee System Launched",
    description:
      "The headquarters launched its trainee system, marking the first ever student admission.",
  },
  {
    date: "April 26, 1957",
    year: "1957",
    title: "Passing of Funakoshi Gichin",
    description: "Funakoshi Gichin passed away at the age of 88.",
  },
  {
    date: "October 20, 1957",
    year: "1957",
    title: "First All Japan Karate Championship",
    description:
      "Japan’s first All Japan Karate Championship was held at the Tokyo Metropolitan Gymnasium. Since then, a yearly All Japan Karate Championship has been conducted.",
  },
  {
    date: "April 10, 1958",
    year: "1958",
    title: "JKA Approved as Incorporated Corporation",
    description:
      "JKA was approved by the Minister of Education as an incorporated corporation (permission committee No.180).",
  },
  {
    date: "1958",
    year: "1958",
    title: "Nakayama Masatoshi Inaugurated as Chief Instructor",
    description:
      "Master Nakayama Masatoshi was inaugurated as Chief Instructor.",
  },
  {
    date: "1961",
    year: "1961",
    title: "Crown Prince Attends 5th All Japan Championship",
    description:
      "The Crown Prince at that time bestowed his presence during the 5th All Japan Karate Championship.",
  },
  {
    date: "1962",
    year: "1962",
    title: "All Japan Karatedo Tournament held in Fukuoka",
    description:
      "The All Japan Karatedo Tournament was held in Kyushu Fukuoka and has been conducted 8 times since then.",
  },
  {
    date: "1964",
    year: "1964",
    title: "Championship Postponed for Tokyo Olympic Games",
    description:
      "The All Japan Karate Championship was postponed to give way for the Tokyo Olympic Games.",
  },
  {
    date: "1965",
    year: "1965",
    title: "8th All Japan Karate Championship at Nippon Budokan",
    description:
      "The 8th All Japan Karate Championship was held at the Nippon Budokan.",
  },
  {
    date: "1975",
    year: "1975",
    title: "1st IAKF World Karatedo Championship",
    description:
      "The IAKF World Karatedo Championship was held in the USA and conducted every 2 years until the 4th Championship.",
  },
  {
    date: "April 20, 1976",
    year: "1976",
    title: "Passing of Master Miyata Minoru",
    description: "Master Miyata Minoru passed away at the age of 60.",
  },
  {
    date: "1983",
    year: "1983",
    title: "All Japan Karatedo Camp Commenced",
    description:
      "All Japan Karatedo Camp was arranged by organizers at the Katsuura training center, Nippon Budokan, and has been conducted yearly thereafter.",
  },
  {
    date: "1985",
    year: "1985",
    title: "1st Shoto Cup World Karate Championship",
    description:
      "The 1st SHOTO CUP World Karate Championship was held and conducted every 3 years thereafter.",
  },
  {
    date: "April 15, 1987",
    year: "1987",
    title: "Passing of Master Nakayama Masatoshi",
    description:
      "Chief Instructor Nakayama Masatoshi passed away at the age of 74.",
  },
  {
    date: "1991",
    year: "1991",
    title: "Sugiura Motokuni Inaugurated as Chief Instructor",
    description:
      "Master Sugiura Motokuni was inaugurated as the chief instructor.",
  },
  {
    date: "2010",
    year: "2010",
    title: "Ueki Masaaki Inaugurated as Chief Instructor",
    description:
      "Master Ueki Masaaki was inaugurated as the chief instructor.",
  },
  {
    date: "April 1, 2012",
    year: "2012",
    title: "JKA Certified as Public Interest Incorporated Association",
    description:
      "The cabinet office certified the Japan Karate Association as a Public Interest Incorporated Association (government benefit no. 2749).",
  },
  {
    date: "2015",
    year: "2015",
    title: "First Official JKA WF Country Licence for Bangladesh",
    description:
      "A historic milestone was achieved when Bangladesh received its first official JKA WF Country Licence—the first recognition of its kind in the nation's history. The licence was formally presented at the JKA WF Headquarters in Tokyo, where Sensei Tulu Ush Shams, Country Representative, led the Bangladesh delegation. He was accompanied by Sensei Imtiaz Salim (4th Dan) during the official licensing ceremony.",
  },

];

export default function ChronologyPage() {
  return (
    <div>
      <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
        History
      </p>
      <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
        JKA <span className="text-accent-red italic">Chronology</span>
      </h1>
      <div className="h-px w-24 bg-accent-red mb-12" />

      <div className="relative border-l-2 border-zinc-200 ml-4 md:ml-32 space-y-12">
        {chronologyEvents.map((event, index) => (
          <div key={index} className="relative pl-8 md:pl-10 group">
            {/* Timeline node dot */}
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-accent-red bg-white group-hover:bg-accent-red transition-colors duration-300" />

            {/* Year / Date Label on the left for medium & up screens */}
            <div className="md:absolute md:-left-36 md:top-0 md:w-28 md:text-right">
              <span className="block font-heading font-bold text-lg text-accent-red">
                {event.year}
              </span>
              <span className="block text-xs text-zinc-400 font-medium">
                {event.date.includes(",")
                  ? event.date.split(",")[0]
                  : ""}
              </span>
            </div>

            {/* Mobile-only date label
            <div className="md:hidden mb-1">
              <span className="font-heading font-bold text-base text-accent-red">
                {event.date}
              </span>
            </div> */}

            {/* Content card */}
            <div className="bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-100 rounded-lg p-5 transition-all duration-300 shadow-sm hover:shadow mt-2">
              <h3 className="font-serif font-bold text-lg text-zinc-900 mb-2">
                {event.title}
              </h3>
              <p className="text-zinc-700 leading-relaxed text-sm">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
