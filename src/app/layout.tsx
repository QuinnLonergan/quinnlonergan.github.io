import type { Metadata, Viewport } from "next";
import { Archivo, DM_Mono, Instrument_Serif } from "next/font/google";
import GrainOverlay from "@/components/GrainOverlay";
import CustomCursor from "@/components/CustomCursor";
import Header from "@/components/Header";
import CRTFilter from "@/components/CRTFilter";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Quinn Lonergan",
  description: "Full Stack Engineer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${dmMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <div className="crt-wrapper">
          <Header />
          {children}
        </div>
        <CRTFilter />
        <div className="scanlines" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        <GrainOverlay />
        <CustomCursor />
      </body>
    </html>
  );
}
