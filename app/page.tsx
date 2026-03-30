"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);

  // Ahora recibimos un array de objetos, tal como dicta la interfaz
  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    // Validamos que haya detectado al menos uno
    if (detectedCodes.length > 0) {
      const detectedText = detectedCodes[0].rawValue;
      console.log("Scanned URL:", detectedText);
      setDaemonUrl(detectedText);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F0C29] p-4">
      <div className="w-full max-w-md p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-green-400/20 shadow-2xl">
        <h1 className="text-2xl font-semibold mb-6 text-center font-mono text-white">
          &gt; Link_Lab
        </h1>

        {!daemonUrl ? (
          <div className="flex flex-col items-center">
            <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-green-400/30 relative">
              {/* COMPONENTE ACTUALIZADO */}
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error("Camera Error:", error)}
                scanDelay={300} // Propiedad directa
                formats={["qr_code"]} // Filtramos para no gastar batería
              />

              <div className="absolute inset-0 border-40 border-black/40 pointer-events-none"></div>
            </div>
            <p className="text-gray-400 mt-6 font-mono text-sm animate-pulse">
              Esperando código QR...
            </p>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-green-400 font-mono mb-2">¡Conectado!</p>
            <p className="text-xs text-gray-500 break-all bg-black/40 p-3 rounded-lg font-mono w-full">
              {daemonUrl}
            </p>
            <button
              onClick={() => setDaemonUrl(null)}
              className="mt-8 px-6 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-full hover:bg-white/10 transition-colors font-mono text-sm"
            >
              Resetear
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
