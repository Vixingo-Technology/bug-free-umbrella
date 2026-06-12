export type SiteLanguage = "en" | "bn";

export const siteContent = {
    en: {
        nav: {
            links: [
                { name: "About", href: "#about" },
                { name: "Journey", href: "#journey" },
                { name: "Techniques", href: "#techniques" },
                { name: "Events", href: "#events" },
                { name: "Branches", href: "#branches" },
            ],
            membership: "Membership",
            languageLabel: "Language",
            english: "ENG",
            bangla: "BN",
        },
        hero: {
            // kicker: "Shotokan Heritage",
            titleLines: ["THE HIGHEST", "TRADITION OF", "MASTERY."],
            description:
                "The sole legal representative of Japan Karate Association (JKA) in Bangladesh. Preserving the discipline, respect, and power of traditional karate-do since 1978.",
            primaryCta: "Begin Your Journey",
            secondaryCta: "Explore Dojos",
            loadingTitle: "Loading Dojo",
            loadingSubtitle: "Preparing the film",
            verticalBrand: "JAPAN KARATE ASSOCIATION BANGLADESH",
        },
        about: {
            titleBefore: "Upholding the",
            titleHighlight: "spirit of",
            titleAfter: "Shotokan",
            paragraphs: [
                "Japan Karate Association (JKA) Bangladesh stands as the premier authority of Shotokan Karate in the nation. We are directly affiliated with JKA World Federation, Tokyo, Japan.",
                "Our mission is to cultivate not just physical strength, but the indomitable spirit, character, and discipline that true martial arts require. We follow the exact syllabus and standards set by the masters in Japan.",
            ],
            stats: [
                { value: "50+", label: "Regional Branches" },
                { value: "10k+", label: "Active Students" },
            ],
        },
        benefits: {
            headingBefore: "Privileges of",
            headingHighlight: "JKA",
            items: [
                {
                    title: "Global Standard",
                    desc: "Training syllabus identical to JKA Honbu Dojo, Tokyo.",
                },
                {
                    title: "JKA Passport",
                    desc: "Official JKA passport recognized in over 100 countries globally.",
                },
                {
                    title: "Dan Certification",
                    desc: "Internationally verifiable Black Belt (Dan) certificates from Japan.",
                },
                {
                    title: "Instructor Qualification",
                    desc: "Pathways to become certified judges, examiners, and instructors.",
                },
                {
                    title: "Tournament Access",
                    desc: "Direct entry to national and international JKA championships.",
                },
                {
                    title: "Educational Tours",
                    desc: "Opportunities for training camps in Japan and other countries.",
                },
            ],
        },
        branches: {
            heading: "Locate a Dojo",
            description:
                "With over 50 registered branches nationwide, find a certified JKA Dojo near you and begin your journey.",
            searchPlaceholder: "SEARCH REGION OR CITY...",
            regions: [
                { name: "Dhaka Division", count: 24 },
                { name: "Chattogram Division", count: 12 },
                { name: "Sylhet Division", count: 6 },
                { name: "Rajshahi Division", count: 5 },
                { name: "Khulna Division", count: 4 },
            ],
            dojoCountLabel: "DOJOS",
            mapLabel: "Interactive Map",
        },
        events: {
            heading: "Upcoming Events",
            viewAll: "View All Events",
            items: [
                {
                    id: 1,
                    title: "15th National Shotokan Championship",
                    date: "Nov 24-26, 2026",
                    location: "Mirpur Indoor Stadium, Dhaka",
                    type: "Tournament",
                    status: "Upcoming",
                    action: "Register Now",
                },
                {
                    id: 2,
                    title: "JKA World Qualification Seminar",
                    date: "Jan 10-12, 2027",
                    location: "JKA HQ, Tokyo (Virtual & Selected)",
                    type: "Seminar",
                    status: "Registration Open",
                    action: "Register Now",
                },
                {
                    id: 3,
                    title: "Summer Gasshuku (Training Camp)",
                    date: "Aug 15, 2026",
                    location: "BKSP, Savar",
                    type: "Training Camp",
                    status: "Completed",
                    action: "View Results",
                },
            ],
        },
        journey: {
            heading: "The Path to Mastery",
            description:
                "Progress through the rigorous JKA ranking system, earning each rank through discipline, dedication, and technical perfection.",
            belts: [
                {
                    desktopLabel: "10th - 9th Kyu",
                    mobileLabel: "White Belt",
                    color: "white",
                    bg: "bg-white",
                    border: "border-zinc-300",
                },
                {
                    desktopLabel: "8th Kyu",
                    mobileLabel: "Yellow Belt",
                    color: "yellow",
                    bg: "bg-yellow-400",
                    border: "border-yellow-500",
                },
                {
                    desktopLabel: "7th Kyu",
                    mobileLabel: "Orange Belt",
                    color: "orange",
                    bg: "bg-orange-500",
                    border: "border-orange-600",
                },
                {
                    desktopLabel: "6th Kyu",
                    mobileLabel: "Green Belt",
                    color: "green",
                    bg: "bg-green-600",
                    border: "border-green-700",
                },
                {
                    desktopLabel: "5th - 4th Kyu",
                    mobileLabel: "Blue Belt",
                    color: "blue",
                    bg: "bg-blue-600",
                    border: "border-blue-700",
                },
                {
                    desktopLabel: "3rd - 1st Kyu",
                    mobileLabel: "Brown Belt",
                    color: "brown",
                    bg: "bg-amber-800",
                    border: "border-amber-900",
                },
                {
                    desktopLabel: "Dan (Black)",
                    mobileLabel: "Black Belt",
                    color: "black",
                    bg: "bg-zinc-950",
                    border: "border-zinc-800",
                },
            ],
        },
        techniques: {
            heading: "The Three Pillars",
            items: [
                {
                    id: "kihon",
                    name: "KIHON",
                    kanji: "基本",
                    desc: "The foundation. Perfecting basic techniques through endless repetition to build muscle memory, power, and form.",
                    image: "https://picsum.photos/seed/kihon/800/1200",
                },
                {
                    id: "kata",
                    name: "KATA",
                    kanji: "型",
                    desc: "The form. Sequence of movements choreographing defense and counter-attack against multiple imagined opponents.",
                    image: "https://picsum.photos/seed/kata/800/1200",
                },
                {
                    id: "kumite",
                    name: "KUMITE",
                    kanji: "組手",
                    desc: "The application. Sparring with an opponent using distance, timing, and control developed in Kihon and Kata.",
                    image: "https://picsum.photos/seed/kumite/800/1200",
                },
            ],
        },
        testimonials: {
            heading: "Voices of the Dojo",
            items: [
                {
                    quote: "Training at JKA Bangladesh has completely transformed my understanding of discipline and physical limitation. The instructors from Honbu Dojo visiting us ensures our standards remain pure.",
                    author: "Rahim Chowdhury",
                    role: "3rd Dan, National Champion",
                    avatar: "https://picsum.photos/seed/user1/100/100",
                },
                {
                    quote: "My journey from a white belt to a black belt under JKA has been the most demanding yet rewarding experience. It's not just a sport; it's a way of life.",
                    author: "Sarah Ahmed",
                    role: "1st Dan",
                    avatar: "https://picsum.photos/seed/user2/100/100",
                },
            ],
        },
        cta: {
            headingLines: ["BEGIN YOUR JOURNEY", "toward mastery"],
            description:
                "Join the legacy. Train under certified masters. Become part of the world's largest and most prestigious Karate organization.",
            primary: "Apply For Membership",
            secondary: "Find Nearest Branch",
        },
        footer: {
            description:
                "The highest tradition of Shotokan Karate representing JKA World Federation in Bangladesh.",
            headings: {
                headquarters: "Headquarters",
                quickLinks: "Quick Links",
                dojoKun: "Dojo Kun",
            },
            quickLinks: [
                { label: "About Us", href: "#about" },
                { label: "Member Privileges", href: "#benefits" },
                { label: "Three Pillars", href: "#techniques" },
                { label: "Events & Championships", href: "#events" },
                { label: "Find a Dojo", href: "#branches" },
            ],
            dojoKun: [
                "Seek perfection of character",
                "Be faithful",
                "Endeavor",
                "Respect others",
                "Refrain from violent behavior",
            ],
            copyright: "All rights reserved.",
            policies: ["Privacy Policy", "Terms of Service"],
        },
    },
    bn: {
        nav: {
            links: [
                { name: "পরিচিতি", href: "#about" },
                { name: "যাত্রা", href: "#journey" },
                { name: "প্রযুক্তি", href: "#techniques" },
                { name: "অনুষ্ঠান", href: "#events" },
                { name: "শাখা", href: "#branches" },
            ],
            membership: "সদস্যতা",
            languageLabel: "ভাষা",
            english: "ENG",
            bangla: "বাংলা",
        },
        hero: {
            // kicker: "শোটোকান ঐতিহ্য",
            titleLines: ["সর্বোচ্চ", "ঐতিহ্য ও", "দক্ষতা."],
            description:
                "জাপান কারাতে অ্যাসোসিয়েশন (JKA)-এর বাংলাদেশে একমাত্র বৈধ প্রতিনিধি। ১৯৭৮ সাল থেকে প্রথাগত কারাতে-দোর শৃঙ্খলা, সম্মান ও শক্তি সংরক্ষণ করে আসছে।",
            primaryCta: "আপনার যাত্রা শুরু করুন",
            secondaryCta: "দোজো দেখুন",
            loadingTitle: "দোজো লোড হচ্ছে",
            loadingSubtitle: "ফিল্ম প্রস্তুত করা হচ্ছে",
            verticalBrand: "জাপান কারাতে অ্যাসোসিয়েশন বাংলাদেশ",
        },
        about: {
            titleBefore: "শোটোকানের",
            titleHighlight: "আত্মাকে",
            titleAfter: "সমুন্নত রাখা",
            paragraphs: [
                "জাপান কারাতে অ্যাসোসিয়েশন (JKA) বাংলাদেশ দেশে শোটোকান কারাতের শীর্ষস্থানীয় কর্তৃপক্ষ। আমরা জাপানের টোকিওতে অবস্থিত JKA ওয়ার্ল্ড ফেডারেশনের সরাসরি সহযোগী।",
                "আমাদের লক্ষ্য শুধু শারীরিক শক্তি নয়, বরং প্রকৃত মার্শাল আর্টের জন্য প্রয়োজনীয় অদম্য মনোবল, চরিত্র ও শৃঙ্খলা গড়ে তোলা। আমরা জাপানের মাস্টারদের নির্ধারিত একই পাঠ্যক্রম ও মানদণ্ড অনুসরণ করি।",
            ],
            stats: [
                { value: "৫০+", label: "আঞ্চলিক শাখা" },
                { value: "১০k+", label: "সক্রিয় শিক্ষার্থী" },
            ],
        },
        benefits: {
            headingBefore: "JKA-র",
            headingHighlight: "সুবিধাসমূহ",
            items: [
                {
                    title: "বিশ্বমানের মানদণ্ড",
                    desc: "জাপানের JKA Honbu Dojo-এর সঙ্গে একই প্রশিক্ষণ পাঠ্যক্রম।",
                },
                {
                    title: "JKA পাসপোর্ট",
                    desc: "বিশ্বের ১০০টিরও বেশি দেশে স্বীকৃত অফিসিয়াল JKA পাসপোর্ট।",
                },
                {
                    title: "ডান সনদ",
                    desc: "জাপান থেকে আন্তর্জাতিকভাবে যাচাইযোগ্য ব্ল্যাক বেল্ট (Dan) সনদ।",
                },
                {
                    title: "ইন্সট্রাক্টর যোগ্যতা",
                    desc: "সার্টিফাইড বিচারক, পরীক্ষক ও প্রশিক্ষক হওয়ার পথ।",
                },
                {
                    title: "টুর্নামেন্টে অংশগ্রহণ",
                    desc: "জাতীয় ও আন্তর্জাতিক JKA চ্যাম্পিয়নশিপে সরাসরি প্রবেশাধিকার।",
                },
                {
                    title: "শিক্ষামূলক সফর",
                    desc: "জাপানসহ বিভিন্ন দেশে প্রশিক্ষণ শিবিরে অংশ নেওয়ার সুযোগ।",
                },
            ],
        },
        branches: {
            heading: "একটি দোজো খুঁজুন",
            description:
                "সারা দেশে ৫০টিরও বেশি নিবন্ধিত শাখা নিয়ে, আপনার কাছাকাছি একটি প্রত্যয়িত JKA দোজো খুঁজে নিন এবং যাত্রা শুরু করুন।",
            searchPlaceholder: "অঞ্চল বা শহর খুঁজুন...",
            regions: [
                { name: "ঢাকা বিভাগ", count: 24 },
                { name: "চট্টগ্রাম বিভাগ", count: 12 },
                { name: "সিলেট বিভাগ", count: 6 },
                { name: "রাজশাহী বিভাগ", count: 5 },
                { name: "খুলনা বিভাগ", count: 4 },
            ],
            dojoCountLabel: "দোজো",
            mapLabel: "ইন্টারঅ্যাক্টিভ মানচিত্র",
        },
        events: {
            heading: "আসন্ন অনুষ্ঠান",
            viewAll: "সব অনুষ্ঠান দেখুন",
            items: [
                {
                    id: 1,
                    title: "১৫তম জাতীয় শোটোকান চ্যাম্পিয়নশিপ",
                    date: "২৪-২৬ নভেম্বর, ২০২৬",
                    location: "মিরপুর ইনডোর স্টেডিয়াম, ঢাকা",
                    type: "টুর্নামেন্ট",
                    status: "আসন্ন",
                    action: "এখনই নিবন্ধন করুন",
                },
                {
                    id: 2,
                    title: "JKA ওয়ার্ল্ড কোয়ালিফিকেশন সেমিনার",
                    date: "১০-১২ জানুয়ারি, ২০২৭",
                    location: "JKA সদর দপ্তর, টোকিও (ভার্চুয়াল ও নির্বাচিত)",
                    type: "সেমিনার",
                    status: "নিবন্ধন চলছে",
                    action: "এখনই নিবন্ধন করুন",
                },
                {
                    id: 3,
                    title: "গ্রীষ্মকালীন গাশুকু (প্রশিক্ষণ শিবির)",
                    date: "১৫ আগস্ট, ২০২৬",
                    location: "বিকেএসপি, সাভার",
                    type: "প্রশিক্ষণ শিবির",
                    status: "সম্পন্ন",
                    action: "ফলাফল দেখুন",
                },
            ],
        },
        journey: {
            heading: "দক্ষতার পথে যাত্রা",
            description:
                "কঠোর JKA র‍্যাংকিং ব্যবস্থার মধ্যে দিয়ে অগ্রসর হন, শৃঙ্খলা, নিবেদন ও কারিগরি নিখুঁততার মাধ্যমে প্রতিটি র‍্যাংক অর্জন করুন।",
            belts: [
                {
                    desktopLabel: "১০ম - ৯ম কিউ",
                    mobileLabel: "সাদা বেল্ট",
                    color: "white",
                    bg: "bg-white",
                    border: "border-zinc-300",
                },
                {
                    desktopLabel: "৮ম কিউ",
                    mobileLabel: "হলুদ বেল্ট",
                    color: "yellow",
                    bg: "bg-yellow-400",
                    border: "border-yellow-500",
                },
                {
                    desktopLabel: "৭ম কিউ",
                    mobileLabel: "কমলা বেল্ট",
                    color: "orange",
                    bg: "bg-orange-500",
                    border: "border-orange-600",
                },
                {
                    desktopLabel: "৬ষ্ঠ কিউ",
                    mobileLabel: "সবুজ বেল্ট",
                    color: "green",
                    bg: "bg-green-600",
                    border: "border-green-700",
                },
                {
                    desktopLabel: "৫ম - ৪র্থ কিউ",
                    mobileLabel: "নীল বেল্ট",
                    color: "blue",
                    bg: "bg-blue-600",
                    border: "border-blue-700",
                },
                {
                    desktopLabel: "৩য় - ১ম কিউ",
                    mobileLabel: "বাদামী বেল্ট",
                    color: "brown",
                    bg: "bg-amber-800",
                    border: "border-amber-900",
                },
                {
                    desktopLabel: "ড্যান (কালো)",
                    mobileLabel: "কালো বেল্ট",
                    color: "black",
                    bg: "bg-zinc-950",
                    border: "border-zinc-800",
                },
            ],
        },
        techniques: {
            heading: "তিন স্তম্ভ",
            items: [
                {
                    id: "kihon",
                    name: "KIHON",
                    kanji: "基本",
                    desc: "ভিত্তি। শক্তি, ভঙ্গি ও পেশী স্মৃতি গড়ে তুলতে মৌলিক কৌশল বারবার অনুশীলন করা।",
                    image: "https://picsum.photos/seed/kihon/800/1200",
                },
                {
                    id: "kata",
                    name: "KATA",
                    kanji: "型",
                    desc: "আকৃতি। কল্পিত একাধিক প্রতিপক্ষের বিরুদ্ধে প্রতিরক্ষা ও প্রতিআক্রমণের গতিসমষ্টি।",
                    image: "https://picsum.photos/seed/kata/800/1200",
                },
                {
                    id: "kumite",
                    name: "KUMITE",
                    kanji: "組手",
                    desc: "প্রয়োগ। Kihon ও Kata-তে অর্জিত দূরত্ব, সময়জ্ঞান ও নিয়ন্ত্রণ ব্যবহার করে প্রতিপক্ষের সঙ্গে স্পারিং।",
                    image: "https://picsum.photos/seed/kumite/800/1200",
                },
            ],
        },
        testimonials: {
            heading: "দোজোর কণ্ঠ",
            items: [
                {
                    quote: "JKA বাংলাদেশে প্রশিক্ষণ আমার শৃঙ্খলা ও শারীরিক সীমাবদ্ধতা সম্পর্কে ধারণা পুরোপুরি বদলে দিয়েছে। Honbu Dojo থেকে আসা প্রশিক্ষকরা আমাদের মানদণ্ডকে বিশুদ্ধ রাখে।",
                    author: "রহিম চৌধুরী",
                    role: "৩য় ড্যান, জাতীয় চ্যাম্পিয়ন",
                    avatar: "https://picsum.photos/seed/user1/100/100",
                },
                {
                    quote: "JKA-র অধীনে সাদা বেল্ট থেকে ব্ল্যাক বেল্টে আমার যাত্রা ছিল সবচেয়ে কঠিন, কিন্তু একই সঙ্গে সবচেয়ে ফলপ্রসূ অভিজ্ঞতা। এটি শুধু একটি খেলা নয়; এটি জীবনযাপন।",
                    author: "সারা আহমেদ",
                    role: "১ম ড্যান",
                    avatar: "https://picsum.photos/seed/user2/100/100",
                },
            ],
        },
        cta: {
            headingLines: ["আপনার যাত্রা শুরু করুন", "দক্ষতার পথে"],
            description:
                "ঐতিহ্যের অংশ হন। প্রত্যয়িত মাস্টারদের অধীনে প্রশিক্ষণ নিন। বিশ্বের সবচেয়ে বড় ও মর্যাদাপূর্ণ কারাতে সংগঠনের অংশ হয়ে উঠুন।",
            primary: "সদস্যতার জন্য আবেদন করুন",
            secondary: "নিকটস্থ শাখা খুঁজুন",
        },
        footer: {
            description:
                "বাংলাদেশে JKA ওয়ার্ল্ড ফেডারেশনের প্রতিনিধিত্বকারী শোটোকান কারাতের সর্বোচ্চ ঐতিহ্য।",
            headings: {
                headquarters: "সদর দপ্তর",
                quickLinks: "দ্রুত লিঙ্ক",
                dojoKun: "দোজো কুন",
            },
            quickLinks: [
                { label: "আমাদের সম্পর্কে", href: "#about" },
                { label: "সদস্য সুবিধা", href: "#benefits" },
                { label: "তিন স্তম্ভ", href: "#techniques" },
                { label: "অনুষ্ঠান ও চ্যাম্পিয়নশিপ", href: "#events" },
                { label: "দোজো খুঁজুন", href: "#branches" },
            ],
            dojoKun: [
                "চরিত্রের পূর্ণতা অর্জন করো",
                "সৎ হও",
                "অধ্যবসায় করো",
                "অন্যদের সম্মান করো",
                "সহিংস আচরণ থেকে বিরত থাকো",
            ],
            copyright: "সর্বস্বত্ব সংরক্ষিত।",
            policies: ["গোপনীয়তা নীতি", "সেবার শর্তাবলি"],
        },
    },
} as const;

export type SiteCopy = (typeof siteContent)[SiteLanguage];
