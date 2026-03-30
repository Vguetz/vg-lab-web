"use client";

import { useState, useEffect, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);

  // Estados de la Terminal
  const [comando, setComando] = useState("");
  const [historial, setHistorial] = useState<string[]>([
    "Esperando conexión con el Lab...",
  ]);

  // NUEVO: Guardamos la referencia del WebSocket para poder enviar mensajes fuera del useEffect
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // NUEVO: Referencia para hacer scroll automático hacia abajo
  const finalHistorialRef = useRef<HTMLDivElement>(null);

  // Auto-scroll cada vez que el historial cambia
  useEffect(() => {
    finalHistorialRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historial]);

  // NUEVO: Efecto para conectarse al WebSocket cuando tenemos la URL
  useEffect(() => {
    if (!daemonUrl) return;

    // Abrimos el túnel bidireccional
    const ws = new WebSocket(daemonUrl);

    ws.onopen = () => {
      setSocket(ws);
      setHistorial((prev) => [...prev, "Túnel WebSocket establecido."]);
    };

    ws.onmessage = (event) => {
      // Cada vez que Rust nos manda algo, lo agregamos a la pantalla
      setHistorial((prev) => [...prev, event.data]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setHistorial((prev) => [
        ...prev,
        "[ERROR]: Fallo en la conexión WebSocket.",
      ]);
    };

    ws.onclose = () => {
      setHistorial((prev) => [...prev, "[SISTEMA]: Conexión cerrada."]);
      setSocket(null);
    };

    // Limpieza: si el usuario se desconecta o cierra la app, cerramos el socket
    return () => {
      ws.close();
    };
  }, [daemonUrl]);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      const detectedText = detectedCodes[0].rawValue;
      setDaemonUrl(detectedText);
    }
  };

  // ACTUALIZADO: Enviar el comando a través del WebSocket en lugar de Fetch
  const enviarComando = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!comando.trim() || !socket || socket.readyState !== WebSocket.OPEN)
      return;

    const comandoAEjecutar = comando;
    setComando(""); // Limpiamos el input

    // Mostramos lo que el usuario escribió
    setHistorial((prev) => [...prev, `\n> ${comandoAEjecutar}`]);

    // Lo disparamos por el túnel hacia la PC
    socket.send(comandoAEjecutar);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F0C29] p-2 sm:p-8">
      <div
        className={`w-full ${
          daemonUrl ? "max-w-5xl h-[90vh] sm:h-auto" : "max-w-md h-auto"
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
                setHistorial(["Esperando conexión con el Lab..."]);
              }}
              className="text-xs sm:text-sm text-red-400 hover:text-red-300 transition px-2 py-1"
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
          // --- PANTALLA 2: LA TERMINAL (Responsive) ---
          <div className="flex flex-col flex-1 overflow-hidden min-h-[50vh]">
            {/* El historial de la consola */}
            <div className="flex-1 bg-[#050414] border border-gray-800 rounded-xl p-3 sm:p-4 overflow-y-auto font-mono text-xs sm:text-sm text-green-400 mb-4 shadow-inner break-words whitespace-pre-wrap">
              {historial.map((linea, index) => (
                <div key={index} className="mb-1 leading-relaxed">
                  {linea}
                </div>
              ))}
              {/* Este div invisible es el ancla para el auto-scroll */}
              <div ref={finalHistorialRef} />
            </div>

            {/* El Input de comandos */}
            <form onSubmit={enviarComando} className="flex gap-2 shrink-0">
              <span className="text-green-500 font-mono text-base sm:text-lg pt-2 sm:pt-1">
                &gt;
              </span>
              <input
                type="text"
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                placeholder="Ingresa un comando..."
                disabled={!socket || socket.readyState !== WebSocket.OPEN}
                className="flex-1 bg-transparent border-b border-gray-600 focus:border-green-400 outline-none text-white font-mono text-sm sm:text-base px-2 py-2 transition-colors disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={
                  !socket ||
                  socket.readyState !== WebSocket.OPEN ||
                  !comando.trim()
                }
                className="px-4 sm:px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs sm:text-sm"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
