import { Fish, Leaf, Wrench, Printer, Calendar, BookOpen } from "lucide-react";

const features = [
  {
    icon: Fish,
    title: "Live Fish & Invertebrates",
    desc: "Connect with breeders selling healthy, quality fish — guppies, cichlids, shrimp, and rare species you won't find at big-box stores.",
    color: "ocean",
  },
  {
    icon: Leaf,
    title: "Aquatic Plants",
    desc: "Rare stem plants, carpeting plants, floating plants, and moss grown by passionate hobbyists and shipped with care.",
    color: "brine",
  },
  {
    icon: Wrench,
    title: "Equipment & Gear",
    desc: "Filters, heaters, lighting, and everything else — sourced from fellow enthusiasts who know what actually works.",
    color: "ocean",
  },
  {
    icon: Printer,
    title: "3D Printed Decor",
    desc: "Custom caves, moss holders, unique decorations — the creative side of the hobby, available on-demand.",
    color: "brine",
  },
  {
    icon: Calendar,
    title: "Local Events",
    desc: "Fish swaps, aquatic expos, club meetups — find what's happening near you and connect with your local fish community.",
    color: "ocean",
  },
  {
    icon: BookOpen,
    title: "Deep Knowledge Base",
    desc: "Species profiles, care guides, a living glossary, and a community forum — everything to help you succeed.",
    color: "brine",
  },
];

const colorMap = {
  ocean: {
    ring: "border-ocean-600/30 group-hover:border-ocean-400/50",
    icon: "text-ocean-400",
    bg: "bg-ocean-800/40",
    glow: "group-hover:shadow-ocean-600/20",
  },
  brine: {
    ring: "border-brine-600/30 group-hover:border-brine-400/50",
    icon: "text-brine-400",
    bg: "bg-brine-900/40",
    glow: "group-hover:shadow-brine-600/20",
  },
};

export default function Features() {
  return (
    <section className="relative py-32 bg-ocean-950">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-900/20 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-4">
            Everything You Need
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-6">
            Built for the{" "}
            <span className="text-ocean-300">Obsessed</span>
          </h2>
          <p className="text-ocean-400 text-lg max-w-xl mx-auto">
            Whether you're a first-time fishkeeper or a seasoned aquascaper, this is your home.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const colors = colorMap[f.color as keyof typeof colorMap];
            return (
              <div
                key={f.title}
                className={`group relative card-deep rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${colors.glow} border ${colors.ring}`}
              >
                <div className={`inline-flex w-12 h-12 rounded-xl ${colors.bg} border ${colors.ring} items-center justify-center mb-5`}>
                  <f.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <h3 className="font-display text-lg text-white mb-3">{f.title}</h3>
                <p className="text-ocean-400 text-base leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
