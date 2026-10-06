import { ImageResponse } from "next/og";
export const alt = "Sarah and Juan — August 27, 2027 — Siempre Valle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f4ed",
        color: "#82707f",
        border: "22px solid #424a39",
      }}
    >
      <div style={{ fontFamily: "serif", fontSize: 145, marginBottom: 12 }}>
        S&amp;J
      </div>
      <div style={{ fontFamily: "serif", fontSize: 46 }}>Sarah and Juan</div>
      <div style={{ fontSize: 20, letterSpacing: 5, marginTop: 34 }}>
        AUGUST 27, 2027 · SIEMPRE VALLE
      </div>
      <div style={{ fontSize: 18, marginTop: 18 }}>
        Valle de Guadalupe, Baja California
      </div>
    </div>,
    size,
  );
}
