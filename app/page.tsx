"use client";

import { useState, useEffect, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

// Mantenemos el CSS aquí porque el CSS no busca variables del navegador y no rompe la compilación
import "xterm/css/xterm.css";

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Guardamos la referencia del motor como 'any' para evitar que TypeScript
  // exija el import estático que nos rompe la compilación
  const xtermRef = useRef<any>(null);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      setDaemonUrl(detectedCodes[0].rawValue);
    }
  };

  useEffect(() => {
    if (!daemonUrl || !terminalRef.current) return;

    let isMounted = true; // Control de seguridad por si el usuario cierra rápido
    let handleResize: () => void;

    // --- LA SOLUCIÓN: Función asíncrona para cargar XTerm en caliente ---
    const arrancarTerminal = async () => {
      // Importamos las clases dinámicamente solo cuando estamos seguros de estar en el navegador
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (!isMounted) return;

      const term = new Terminal({
        cursorBlink: true,
        theme: {
          background: "#050414",
          foreground: "#69f0ae",
          cursor: "#69f0ae",
        },
        fontFamily: "Courier, monospace",
        fontSize: 14,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      xtermRef.current = term;

      // Enchufamos la terminal al div
      term.open(terminalRef.current!);
      fitAddon.fit();

      term.writeln("Conectando con el túnel del Daemon...");

      // Abrimos el túnel WebSocket
      const ws = new WebSocket(daemonUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        term.writeln("Conexión establecida. Iniciando monitor remoto...\r\n");
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      ws.onerror = () => {
        term.writeln(
          "\r\n\x1b[31m[ERROR]: Fallo en la conexión WebSocket.\x1b[0m",
        );
      };

      ws.onclose = () => {
        term.writeln(
          "\r\n\x1b[31m[SISTEMA]: Conexión cerrada por el servidor.\x1b[0m",
        );
        socketRef.current = null;
      };

      // Manejo de redimensión para el Addon
      handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener("resize", handleResize);
    };

    arrancarTerminal();

    // Limpieza profunda al desconectar
    return () => {
      isMounted = false;
      if (handleResize) window.removeEventListener("resize", handleResize);

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [daemonUrl]);

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
              onClick={() => {
                socketRef.current?.close();
                setDaemonUrl(null);
              }}
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
                onError={(error) => console.error("Camera Error:", error)}
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
            <div
              ref={terminalRef}
              className="flex-1 w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-800"
            />
          </div>
        )}
      </div>
    </main>
  );
}
