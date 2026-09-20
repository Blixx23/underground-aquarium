/**
 * Credit line for shop listings that came from OpenStreetMap.
 *
 * OSM data is published under the Open Database License, which asks anyone
 * using it to say where it came from and to point at the licence. Keeping
 * this on any page that shows imported shop details is what keeps us square.
 */
export default function OsmCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-ocean-600 ${className}`}>
      Some shop locations come from{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-ocean-700 underline-offset-2 transition-colors hover:text-ocean-400"
      >
        © OpenStreetMap contributors
      </a>
      , used under the{" "}
      <a
        href="https://opendatacommons.org/licenses/odbl/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-ocean-700 underline-offset-2 transition-colors hover:text-ocean-400"
      >
        Open Database License
      </a>
      . Spotted something wrong?{" "}
      <a
        href="https://www.openstreetmap.org/fixthemap"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-ocean-700 underline-offset-2 transition-colors hover:text-ocean-400"
      >
        Fix it on the map
      </a>{" "}
      — or claim your shop and correct it here.
    </p>
  );
}
