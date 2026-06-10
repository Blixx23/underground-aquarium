const BUBBLES = [
  { left: "4%",  size: 16, delay: 0,    duration: 14 },
  { left: "11%", size: 9,  delay: 5.5,  duration: 18 },
  { left: "18%", size: 22, delay: 2.2,  duration: 12 },
  { left: "26%", size: 11, delay: 8,    duration: 16 },
  { left: "34%", size: 7,  delay: 3.5,  duration: 20 },
  { left: "42%", size: 18, delay: 6.5,  duration: 13 },
  { left: "50%", size: 10, delay: 1.2,  duration: 17 },
  { left: "57%", size: 24, delay: 9,    duration: 11 },
  { left: "64%", size: 8,  delay: 4.2,  duration: 19 },
  { left: "71%", size: 14, delay: 7,    duration: 15 },
  { left: "79%", size: 19, delay: 2.8,  duration: 12 },
  { left: "86%", size: 9,  delay: 10,   duration: 18 },
  { left: "92%", size: 13, delay: 5,    duration: 14 },
  { left: "97%", size: 7,  delay: 8.5,  duration: 21 },
];

export default function Bubbles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -10 }}
    >
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="uw-bubble"
          style={{
            left: b.left,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}