export function DropLine({ visible, top, left, width }) {
  return (
    <div
      style={{
        position: "absolute",
        left: left - 8,
        width: width + 16,
        top,
        height: 2,
        borderRadius: 2,
        background: "#C9A227",
        boxShadow: "0 0 8px rgba(201,162,39,0.55)",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        zIndex: 4,
      }}
    ></div>
  );
}
