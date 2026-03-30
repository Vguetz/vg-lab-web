"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import dynamic from "next/dynamic";

const TerminalRemota = dynamic(() => import("./TerminalComponent"), {
  ssr: false,
  loading: () => {
    console.log("[Page.tsx] Cargando el chunk dinámico de la terminal...");
    return (
      <div className="text-green-400 font-mono p-4 animate-pulse">
        Cargando motor de terminal...
      </div>
    );
  },
});

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log("[Page.tsx] Estado de daemonUrl cambió a:", daemonUrl);
  }, [daemonUrl]);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      const urlEscaneada = detectedCodes[0].rawValue;
      console.log("[Page.tsx] ¡QR Escaneado! Texto crudo:", urlEscaneada);
      setDaemonUrl(urlEscaneada);
    }
  };

  const desconectar = () => {
    console.log(
      "[Page.tsx] Función desconectar invocada. Reseteando daemonUrl.",
    );
    setDaemonUrl(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F0C29] p-2 sm:p-8">
      <div
        className={`w-full ${
          daemonUrl ? "max-w-5xl h-[90vh]" : "max-w-md h-auto"
        } p-4 sm:p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-green-400/20 shadow-2xl transition-all duration-500 flex flex-col`}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
          <h1 className="text-lg sm:text-xl font-semibold font-mono text-white">
            &gt; Link_Lab
          </h1>

          {daemonUrl && (
            <button
              onClick={desconectar}
              className="text-xs sm:text-sm text-red-400 hover:text-red-300 transition px-2 py-1 border border-red-500/30 rounded"
            >
              [Desconectar]
            </button>
          )}
        </div>

        {!daemonUrl ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-full aspect-square max-w-[300px] rounded-2xl overflow-hidden border-2 border-green-400/30 relative">
              <Scanner
                onScan={handleScan}
                onError={(error) =>
                  console.error("[Page.tsx] Camera Error:", error)
                }
                scanDelay={300}
                formats={["qr_code"]}
              />
              <div className="absolute inset-0 border-[30px] sm:border-[40px] border-black/40 pointer-events-none"></div>
            </div>
            <p className="text-gray-400 mt-6 font-mono text-xs sm:text-sm animate-pulse text-center">
              Apunta al QR del Daemon...
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <TerminalRemota daemonUrl={daemonUrl} onDisconnect={desconectar} />
          </div>
        )}
      </div>
    </main>
  );
}
