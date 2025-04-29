import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Literal, Union
import time

# --- Agent Communication Protocol ---

@dataclass
class AAMessage:
    """Represents a message in the Agent-to-Agent Protocol."""
    sender_id: str # ID of the agent sending the message (e.g., 'extraction_agent', 'api_trigger')
    receiver_id: str # ID of the intended recipient agent (e.g., 'classifier_agent')
    message_type: str # Type of message (e.g., 'data_cleansed', 'request_classification')
    payload: Any # The actual data being sent (e.g., List[CleansedTransaction], ExceptionRecord)
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict) # Optional metadata (e.g., job_id, priority)

# --- Data Structures for Payloads ---

@dataclass
class RawTransaction:
    """Represents data as initially ingested."""
    source: str
    data: Dict[str, Any]
    id: str = field(default_factory=lambda: f"raw_{uuid.uuid4().hex[:8]}") # Shorter unique ID

@dataclass
class CleansedTransaction:
    """Represents data after cleansing and normalization."""
    original_id: str
    source: str
    normalized_data: Dict[str, Any]
    validation_status: str = "Passed" # or "Failed"
    processing_log: List[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: f"clean_{uuid.uuid4().hex[:8]}")

@dataclass
class TaggedTransaction:
    """Represents data after classification."""
    cleansed_id: str
    source: str
    normalized_data: Dict[str, Any]
    tags: Dict[str, Any] # e.g., {'category': 'Expense', 'risk': 'Low', 'product': 'Software'}
    confidence: Optional[float] = None
    id: str = field(default_factory=lambda: f"tagged_{uuid.uuid4().hex[:8]}")

@dataclass
class MatchResult:
    """Represents a successful match between transactions."""
    match_id: str
    matched_transaction_ids: List[str]
    match_type: str # e.g., "Exact", "Fuzzy"
    confidence: Optional[float] = None

@dataclass
class ExceptionRecord:
    """Represents a transaction or situation requiring manual review or specific routing."""
    exception_id: str
    related_transaction_ids: List[str]
    exception_type: str # e.g., "Unmatched", "Data Discrepancy", "Policy Violation"
    severity: str # e.g., "High", "Medium", "Low"
    details: Dict[str, Any]
    suggested_action: Optional[str] = None # Could be populated by Reconciliation or Routing agent (using LLM?)

@dataclass
class Ticket:
    """Represents a ticket created in an external system (e.g., JIRA, ServiceNow)."""
    ticket_id: str # ID from the external system
    system: str # e.g., "JIRA", "ServiceNow"
    exception_id: str
    summary: str
    assignee: Optional[str] = None
    status: str = "Open"

@dataclass
class AgentMetrics:
    """Represents metrics collected by the Supervisor."""
    agent_name: str
    timestamp: float
    metrics: Dict[str, Any] # e.g., {'throughput': 100, 'latency_ms': 500, 'error_rate': 0.01}

# --- Data Structures for File Handling ---

@dataclass
class FileInfo:
    """Information about an uploaded file."""
    original_filename: str
    temp_path: str
    content_type: str
    size: int
    is_text: bool = False  # Default to False since we're handling Excel files
    encoding: str = "utf-8"  # Default encoding, not used for Excel files
    
    def __post_init__(self):
        """Validate file info after initialization."""
        if not self.original_filename:
            raise ValueError("original_filename cannot be empty")
        if not self.temp_path:
            raise ValueError("temp_path cannot be empty")
        if not self.content_type:
            raise ValueError("content_type cannot be empty")

# --- Specific Payload Types for Clarity (Optional but Recommended) ---

@dataclass
class FileHeaderInfo:
    """Represents header information from a file."""
    file_name: str
    headers: List[str]
    sample_data: Dict[str, List[str]]  # First few rows of data for each header

@dataclass
class ReconciliationConfig:
    """Represents user's reconciliation configuration."""
    source_file: str
    target_file: str
    matching_headers: Dict[str, str]  # Maps source header to target header
    tolerance_rules: Dict[str, float]  # Optional tolerance for numeric fields

@dataclass
class ExtractionRequestPayload:
    """Request payload for data extraction."""
    uploaded_files_info: List[FileInfo]
    reconciliation_config: Optional[ReconciliationConfig] = None
    
    def __post_init__(self):
        """Convert dict to FileInfo if needed."""
        if self.uploaded_files_info and isinstance(self.uploaded_files_info[0], dict):
            self.uploaded_files_info = [
                FileInfo(**file_info) if isinstance(file_info, dict) else file_info
                for file_info in self.uploaded_files_info
            ]

@dataclass
class ExtractionResultPayload:
    """Result payload from data extraction."""
    cleansed_transactions: List[CleansedTransaction]
    metrics: Dict[str, Any]
    
    def __post_init__(self):
        """Ensure metrics has required fields."""
        required_metrics = {
            "files_processed": 0,
            "records_ingested": 0,
            "records_validated_after_dedupe": 0,
            "validation_errors": 0,
            "duplicates_removed": 0
        }
        self.metrics = {**required_metrics, **self.metrics}

@dataclass
class ClassificationRequestPayload:
    transactions_to_classify: List[CleansedTransaction]

@dataclass
class ClassificationResultPayload:
    tagged_transactions: List[TaggedTransaction]
    metrics: Dict[str, Any]

@dataclass
class ReconciliationRequestPayload:
    transactions_to_reconcile: List[TaggedTransaction]

@dataclass
class ReconciliationResultPayload:
    matches: List[MatchResult]
    exceptions: List[ExceptionRecord]
    metrics: Dict[str, Any]

@dataclass
class RoutingRequestPayload:
    exceptions_to_route: List[ExceptionRecord]

@dataclass
class RoutingResultPayload:
    tickets_created: List[Ticket]
    metrics: Dict[str, Any]

@dataclass
class SummaryRequestPayload:
    job_results_so_far: Dict # Aggregated results from previous steps

@dataclass
class SummaryResultPayload:
    final_summary: str
    # metrics: Dict[str, Any] # Supervisor might have its own metrics