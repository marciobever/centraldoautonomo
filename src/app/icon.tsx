import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #5b5ef4 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          CA
        </span>
      </div>
    ),
    { ...size }
  );
}
