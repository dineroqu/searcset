"""
WebSocket Handler — Real-time updates ke frontend
"""
import json
import logging
import asyncio
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manajemen koneksi WebSocket"""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WS terhubung. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WS terputus. Total: {len(self.active_connections)}")

    async def broadcast(self, event: str, data: dict):
        """Kirim pesan ke semua koneksi aktif"""
        message = json.dumps({"event": event, "data": data})
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.add(connection)
        self.active_connections -= disconnected

    async def send_personal(self, websocket: WebSocket, event: str, data: dict):
        """Kirim pesan ke koneksi tertentu"""
        message = json.dumps({"event": event, "data": data})
        try:
            await websocket.send_text(message)
        except Exception:
            self.active_connections.discard(websocket)


# Singleton
ws_manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """Handler WebSocket utama"""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                event = msg.get("event", "")

                if event == "ping":
                    await ws_manager.send_personal(
                        websocket, "pong", {"timestamp": msg.get("timestamp")}
                    )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
