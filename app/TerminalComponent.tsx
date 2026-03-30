"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";

interface TerminalProps {
  daemonUrl: string;
  onDisconnect: () => void;
}

export default function TerminalComponent({
  daemonUrl,
  onDisconnect,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    console.log(
      "[TerminalComponent] useEffect iniciado. Intentando montar en div:",
      terminalRef.current,
    );
    if (!terminalRef.current) {
      console.warn(
        "[TerminalComponent] terminalRef.current es nulo. Abortando.",
      );
      return;
    }

    console.log("[TerminalComponent] Instanciando XTerm...");
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

    term.open(terminalRef.current);
    fitAddon.fit();
    console.log("[TerminalComponent] XTerm inyectado en el DOM correctamente.");

    term.writeln("Conectando con el túnel del Daemon...");

    console.log(
      "[TerminalComponent] Iniciando instancia WebSocket con URL:",
      daemonUrl,
    );
    const ws = new WebSocket(daemonUrl);
    socketRef.current = ws;

    // --- LOGS DEL CICLO DE VIDA DEL WEBSOCKET ---

    ws.onopen = (event) => {
      console.log(
        "[WebSocket] Evento 'onopen' disparado. Conexión exitosa.",
        event,
      );
      term.writeln("Conexión establecida. Iniciando monitor remoto...\r\n");
    };

    ws.onmessage = (event) => {
      console.log(
        "[WebSocket] Evento 'onmessage' disparado. Longitud de datos recibida:",
        event.data?.length,
      );
      term.write(event.data);
    };

    ws.onerror = (error) => {
      // El navegador a veces no expone el motivo exacto del error por seguridad, pero veremos el objeto.
      console.error(
        "[WebSocket] Evento 'onerror' disparado. Fallo en la conexión.",
        error,
      );
      term.writeln(
        "\r\n\x1b[31m[ERROR]: Fallo en la conexión WebSocket.\x1b[0m",
      );
    };

    ws.onclose = (event) => {
      console.log(
        `[WebSocket] Evento 'onclose' disparado. Código: ${event.code}, Razón: ${event.reason}, Limpio: ${event.wasClean}`,
      );
      term.writeln(
        "\r\n\x1b[31m[SISTEMA]: Conexión cerrada por el servidor.\x1b[0m",
      );
      onDisconnect();
    };

    term.onData((data) => {
      // Logueamos solo un indicador para no llenar la consola si tipeamos mucho, pero lo suficiente para saber que llega a la web
      console.log(
        `[XTerm] Usuario tipeó algo. Enviando al socket. Longitud: ${data.length}`,
      );
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else {
        console.warn(
          `[XTerm] Intento de envío, pero el socket NO está OPEN. Estado actual: ${ws.readyState}`,
        );
      }
    });

    const handleResize = () => {
      console.log(
        "[TerminalComponent] Ventana redimensionada, ajustando XTerm.",
      );
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      console.log(
        "[TerminalComponent] Limpieza de useEffect. Cerrando conexiones y destruyendo terminal.",
      );
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [daemonUrl, onDisconnect]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-800"
    />
  );
}
