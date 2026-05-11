import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
};

export default function QrCode({ value, size = 240 }: Props) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setSrc("");
    setFailed(false);

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#0b0f14",
        light: "#0000",
      },
    })
      .then((next) => {
        if (!cancelled) {
          setSrc(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  if (failed) {
    return (
      <div
        style={{
          width: size,
          minHeight: size,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.12)",
          display: "grid",
          placeItems: "center",
          padding: 16,
          textAlign: "center",
          background: "rgba(255,255,255,.04)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    );
  }

  return src ? (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: 22,
        background: "#f8fafc",
        padding: 12,
        border: "1px solid rgba(255,255,255,.20)",
        boxShadow: "0 18px 42px rgba(15,23,42,.24)",
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.12)",
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,.04)",
      }}
    >
      QR...
    </div>
  );
}
