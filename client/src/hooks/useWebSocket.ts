import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '../types';

interface UseWebSocketReturn {
  connect: (buildId: string) => void;
  disconnect: () => void;
  lastMessage: WSMessage | null;
  isConnected: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback((buildId: string) => {
    disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws?buildId=${encodeURIComponent(buildId)}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    wsRef.current = ws;
  }, [disconnect]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, lastMessage, isConnected };
}
