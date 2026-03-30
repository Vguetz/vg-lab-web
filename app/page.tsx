"use client";

import { useState, useEffect, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

// Importamos el motor XTerm y sus estilos oficiales
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Referencia al <div> vacío donde XTerm va a inyectar la pantalla negra
  const terminalRef = useRef<HTMLDivElement>(null);

  // Referencias para guardar el motor y el plugin sin que React los re-renderice
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      setDaemonUrl(detectedCodes[0].rawValue);
    }
  };

  // EFECTO PRINCIPAL: Iniciar WebSocket y XTerm juntos
  useEffect(() => {
    if (!daemonUrl || !terminalRef.current) return;

    // 1. Instanciamos la terminal de XTerm
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#050414", // Tu fondo oscuro hacker
        foreground: "#69f0ae", // Tu texto verde
        cursor: "#69f0ae",
      },
      fontFamily: "Courier, monospace",
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Guardamos las referencias
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // "Enchufamos" la terminal al div de la pantalla
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln("Conectando con el túnel del Daemon...");

    // 2. Abrimos el túnel WebSocket
    const ws = new WebSocket(daemonUrl);
    setSocket(ws);

    ws.onopen = () => {
      term.writeln("Conexión establecida. Iniciando monitor remoto...\r\n");
    };

    // 3. LA MAGIA BIDIRECCIONAL

    // A) Cuando la PC manda texto o colores, lo escribimos en la pantalla de XTerm
    ws.onmessage = (event) => {
      term.write(event.data);
    };

    // B) Cuando el usuario teclea algo en la pantalla negra de XTerm, lo mandamos a la PC
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
      setSocket(null);
    };

    // 4. Hacer que la terminal se redimensione si volteas el celular
    const handleResize = () => {
      fitAddon.fit();
      // Opcional: Mandar un mensaje a Rust de que la pantalla cambió de tamaño
    };
    window.addEventListener("resize", handleResize);

    // Limpieza al desconectar
    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
      setSocket(null);
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
                socket?.close();
                setDaemonUrl(null);
              }}
              className="text-xs sm:text-sm text-red-400 hover:text-red-300 transition px-2 py-1 border border-red-500/30 rounded"
            >
              [Desconectar]
            </button>
          )}
        </div>

        {!daemonUrl ? (
          // --- PANTALLA 1: ESCÁNER ---
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
          // --- PANTALLA 2: LA TERMINAL (XTerm.js) ---
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Eliminamos el <form> y el <input>. 
              Ahora XTerm toma control total de este div. 
            */}
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
