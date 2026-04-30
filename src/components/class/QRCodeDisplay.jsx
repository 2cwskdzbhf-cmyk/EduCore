import React, { useEffect, useRef } from 'react';

// Minimal QR code renderer using SVG path — no external library needed
// We'll render the URL as a simple QR via a free API (data URL)

export default function QRCodeDisplay({ value }) {
  const encoded = encodeURIComponent(value);
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&bgcolor=1e1b4b&color=ffffff&margin=12`;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <img
          src={apiUrl}
          alt="QR Code"
          className="w-40 h-40 rounded-xl"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <p className="text-xs text-slate-500 font-mono break-all max-w-xs text-center">{value}</p>
      <a
        href={apiUrl}
        download="invite-qr.png"
        className="text-xs text-purple-400 hover:text-purple-300 underline"
      >
        Download QR Code
      </a>
    </div>
  );
}