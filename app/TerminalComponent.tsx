"use client";

import { useEffect, useRef } from "react";
// Aquí SÍ podemos importar estáticamente porque este componente
// solo vivirá en el navegador gracias a next/dynamic
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
    if (!terminalRef.current) return;

    // 1. Iniciamos XTerm inmediatamente (sin await)
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

    term.writeln("Conectando con el túnel del Daemon...");

    // 2. Abrimos el WebSocket
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
      onDisconnect(); // Le avisamos al padre que se cerró
    };

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
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
