import QRCode from "qrcode";

/**
 * The attendee's check-in pass: the registration number plus a QR code encoding
 * it. Rendered on a white panel because QR scanners expect dark-on-light, and an
 * inverted code fails on some phone cameras.
 *
 * The QR is generated server-side into a data URI, so the page needs no client
 * JavaScript and the code still shows if the attendee is offline at the venue.
 */
export default async function RegistrationPass({
  registrationCode,
  className = "",
}: {
  registrationCode: string;
  className?: string;
}) {
  const qrDataUrl = await QRCode.toDataURL(registrationCode, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#0A0A0BFF", light: "#FFFFFFFF" },
  });

  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 sm:p-8 ${className}`}>
      <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-accent">Your registration number</p>
      <p className="mt-3 font-display text-4xl uppercase tracking-[0.08em] text-text sm:text-5xl">{registrationCode}</p>
      <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">
        Show this code at check-in. Screenshot it, or find it any time under My account.
      </p>
      <div className="mt-6 inline-block rounded-2xl bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URI, nothing for the image optimizer to fetch */}
        <img
          src={qrDataUrl}
          alt={`QR code for registration ${registrationCode}`}
          width={200}
          height={200}
          className="h-[200px] w-[200px]"
        />
      </div>
    </div>
  );
}
