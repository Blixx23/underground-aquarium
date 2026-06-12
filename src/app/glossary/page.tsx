import GlossaryExplorer from "@/components/glossary/GlossaryExplorer";

export const metadata = {
  title: "Glossary",
  description:
    "An A–Z glossary of aquarium and fishkeeping terms in plain English — searchable and filterable, from ammonia to water changes.",
};

export default function GlossaryPage() {
  return <GlossaryExplorer />;
}