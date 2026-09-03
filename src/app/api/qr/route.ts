import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/**
 * QR renderer used for seller links and pickup codes.
 * `/api/qr?data=<text>&size=<px>` returns an SVG (printable and scalable).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  if (!data || data.length > 1024) return NextResponse.json({ error: "Missing or oversized data" }, { status: 400 });

  const size = Math.min(1024, Math.max(96, Number(searchParams.get("size") ?? 320) || 320));

  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: "#0F1B2D", light: "#FFFFFF" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
