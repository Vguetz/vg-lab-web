"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

export default function Home() {
  const [daemonUrl, setDaemonUrl] = useState<string | null>(null);

  // -- NUEVOS ESTADOS PARA LA TERMINAL --
  const [comando, setComando] = useState("");
  // Guardaremos el historial de la terminal en un array de strings
  const [historial, setHistorial] = useState<string[]>([
    "Conectado exitosamente al Lab.",
    "Escribe un comando de Windows (ej: dir, whoami) y presiona Enter...",
  ]);
  const [cargando, setCargando] = useState(false);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      const detectedText = detectedCodes[0].rawValue;
      console.log("Scanned URL:", detectedText);
      setDaemonUrl(detectedText);
    }
  };

  // -- NUEVA FUNCIÓN: Enviar el comando al backend en Rust --
  const enviarComando = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Evita que la página recargue al dar Enter
    if (!comando.trim() || !daemonUrl) return;

    const comandoAEjecutar = comando;
    setComando(""); // Limpiamos el input

    // Agregamos el comando que el usuario tipeó al historial
    setHistorial((prev) => [...prev, `\n> ${comandoAEjecutar}`]);
    setCargando(true);

    try {
      // Hacemos la petición a la IP de Ngrok que nos dio el QR
      const respuesta = await fetch(daemonUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comando: comandoAEjecutar }),
      });

      if (!respuesta.ok) {
        throw new Error(`Error del servidor: ${respuesta.status}`);
      }

      // Rust nos devuelve el texto crudo de la consola de Windows
      const textoRespuesta = await respuesta.text();

      // Agregamos la respuesta al historial
      setHistorial((prev) => [...prev, textoRespuesta]);
    } catch (error) {
      setHistorial((prev) => [
        ...prev,
        `[ERROR]: No se pudo conectar con el Daemon. ¿Sigue encendido?`,
      ]);
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F0C29] p-4 sm:p-8">
      {/* Si hay URL conectada, la tarjeta se hace más ancha para simular una pantalla de PC.
        Si no, se queda pequeñita como escáner de celular. 
      */}
      <div
        className={`w-full ${daemonUrl ? "max-w-4xl" : "max-w-md"} p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-green-400/20 shadow-2xl transition-all duration-500`}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold font-mono text-white">
            &gt; Link_Lab
          </h1>

          {/* Botón sutil para desconectar si ya estamos en la terminal */}
          {daemonUrl && (
            <button
              onClick={() => {
                setDaemonUrl(null);
                setHistorial([
                  "Conectado exitosamente al Lab.",
                  "Escribe un comando...",
                ]); // Reiniciamos
              }}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              [Desconectar]
            </button>
          )}
        </div>

        {!daemonUrl ? (
          // --- PANTALLA 1: ESCÁNER (Igual que antes) ---
          <div className="flex flex-col items-center">
            <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-green-400/30 relative">
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error("Camera Error:", error)}
                scanDelay={300}
                formats={["qr_code"]}
              />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
            </div>
            <p className="text-gray-400 mt-6 font-mono text-sm animate-pulse">
              Esperando código QR...
            </p>
          </div>
        ) : (
          // --- PANTALLA 2: LA TERMINAL ---
          <div className="flex flex-col h-[60vh] md:h-[70vh]">
            {/* El historial de la consola */}
            <div className="flex-1 bg-[#050414] border border-gray-800 rounded-xl p-4 overflow-y-auto font-mono text-sm text-green-400 mb-4 whitespace-pre-wrap shadow-inner">
              {historial.map((linea, index) => (
                <div key={index} className="mb-1 leading-relaxed">
                  {linea}
                </div>
              ))}
              {cargando && (
                <div className="animate-pulse opacity-50">Cargando...</div>
              )}
            </div>

            {/* El Input de comandos */}
            <form onSubmit={enviarComando} className="flex gap-2">
              <span className="text-green-500 font-mono text-lg pt-2">
                &gt;
              </span>
              <input
                type="text"
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                placeholder="Ingresa un comando..."
                disabled={cargando}
                className="flex-1 bg-transparent border-b border-gray-600 focus:border-green-400 outline-none text-white font-mono px-2 py-2 transition-colors disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={cargando || !comando.trim()}
                className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
              >
                Ejecutar
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
