import time
import uuid
import asyncio
from typing import Dict, List

# Store workflow events in memory (in production, use a proper database)
workflow_events: List[Dict] = []
connected_clients: List = []

async def broadcast_workflow_event(event: Dict):
    """Broadcast a workflow event to all connected clients."""
    for client in connected_clients:
        try:
            await client.send_json(event)
        except:
            # Remove disconnected clients
            connected_clients.remove(client)

def add_workflow_event(agent: str, action: str, status: str, details: str):
    """Add a new workflow event and broadcast it to connected clients."""
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "agent": agent,
        "action": action,
        "status": status,
        "details": details
    }
    workflow_events.append(event)
    asyncio.create_task(broadcast_workflow_event(event)) 