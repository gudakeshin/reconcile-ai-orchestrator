import os
import uuid
import time
import logging
import asyncio
import json
import pandas as pd
from typing import List, Dict, Any, Optional
import tempfile
import shutil
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Path, WebSocket, Form
from fastapi.middleware.cors import CORSMiddleware
import aiohttp_cors # Explicit import for CORS options
from fastapi.websockets import WebSocketDisconnect

from llm_client import LLMClient
from data_models import ( # Import specific payload/message types too
    AAMessage, ExtractionRequestPayload, ExtractionResultPayload,
    ClassificationRequestPayload, ClassificationResultPayload,
    ReconciliationRequestPayload, ReconciliationResultPayload,
    RoutingRequestPayload, RoutingResultPayload,
    SummaryRequestPayload, SummaryResultPayload,
    FileInfo, FileHeaderInfo, ReconciliationConfig
)
# Import agent classes
from agents import (
    BaseAgent, DataExtractionCleansingAgent, ClassifierAgent,
    ReconciliationAgent, RoutingAgent, SupervisorAgent
)
from workflow_events import workflow_events, connected_clients, broadcast_workflow_event, add_workflow_event

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI App Initialization ---
app = FastAPI(
    title="ReconAI Agent Orchestrator (AA Protocol)",
    description="API using Agent-to-Agent Protocol for reconciliation.",
    version="0.2.0"
)

# --- CORS Configuration ---
origins = [
    "http://localhost",
    "http://localhost:8080", # Default port in vite.config.ts
    "http://localhost:5173", # Common Vite default
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    # Add your deployed frontend URL here if applicable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"]  # Expose all headers
)

# --- Global State / Job Management (In-memory - replace with DB/Redis for production) ---
jobs: Dict[str, Dict[str, Any]] = {}
file_headers: Dict[str, FileHeaderInfo] = {}  # Store header info for uploaded files
uploaded_files: Dict[str, str] = {}  # Map file IDs to their temp paths
temp_files: Dict[str, Dict[str, Any]] = {}  # Stores temp file info permanently by full path
AGENT_ORCHESTRATOR_ID = "api_orchestrator"

# --- Initialize LLM Client and Agents (Singleton instances) ---
llm = None
try:
    llm = LLMClient() # Assumes defaults from llm_client.py
except ConnectionError as e:
    logger.error(f"CRITICAL: Could not connect to Ollama on startup. LLM features disabled. {e}")

# Instantiate agents (can be singletons if they don't hold job-specific state)
classifier_agent = ClassifierAgent(llm_client=llm, next_agent=None)
reconciliation_agent = ReconciliationAgent(llm_client=llm, routing_agent=None)
routing_agent = RoutingAgent(llm_client=llm)
supervisor_agent = SupervisorAgent(llm_client=llm, monitored_agents=[])

# Note: extraction_agent is initialized per job in run_reconciliation_pipeline
agent_registry = {
    "classifier_agent": classifier_agent,
    "reconciliation_agent": reconciliation_agent,
    "routing_agent": routing_agent,
    "supervisor_agent": supervisor_agent,
}

# --- Helper Function for Workflow Execution using AA Protocol ---

@app.websocket("/ws/workflow")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

@app.get("/api/workflow/events")
async def get_workflow_events():
    """Get all workflow events."""
    return workflow_events

async def run_reconciliation_pipeline(job_id: str, uploaded_files_info: List[Dict], config: ReconciliationConfig):
    """
    Orchestrates the pipeline using Agent-to-Agent Protocol messages.
    Runs in the background and updates the job status.
    """
    logger.info(f"[Job {job_id}] Orchestrator starting pipeline...")
    jobs[job_id]['status'] = 'running'
    jobs[job_id]['current_step'] = 'Starting Extraction'
    jobs[job_id]['log'] = [f"Pipeline started at {time.time()}"]
    jobs[job_id]['results'] = {} # Store results per stage
    jobs[job_id]['start_time'] = time.time()  # Ensure consistent timestamp format
    pipeline_start_time = time.time()

    try:
        # Initialize agents with proper arguments
        extraction_agent = DataExtractionCleansingAgent(llm_client=llm, uploaded_files_info=uploaded_files_info)
        classifier_agent = ClassifierAgent(llm_client=llm)
        reconciliation_agent = ReconciliationAgent(llm_client=llm)
        routing_agent = RoutingAgent(llm_client=llm)
        supervisor_agent = SupervisorAgent(llm_client=llm, monitored_agents=[
            extraction_agent, classifier_agent, reconciliation_agent, routing_agent
        ])

        # Data Extraction & Cleansing
        add_workflow_event(
            "Data Extraction & Cleansing",
            "Processing uploaded files",
            "in-progress",
            f"Processing {len(uploaded_files_info)} files"
        )
        
        # Create initial message for extraction
        initial_message = AAMessage(
            sender_id="api_orchestrator",
            receiver_id="data_extraction_agent",
            message_type="extraction_request",
            payload=ExtractionRequestPayload(uploaded_files_info=uploaded_files_info)
        )
        
        # Process through the pipeline
        extraction_result = await extraction_agent.process(initial_message)
        add_workflow_event(
            "Data Extraction & Cleansing",
            "Files processed",
            "completed",
            f"Successfully processed {len(extraction_result.payload.cleansed_transactions)} records"
        )

        # Classification
        add_workflow_event(
            "Classifier",
            "Categorizing transactions",
            "in-progress",
            "Analyzing transaction patterns"
        )
        classification_result = await classifier_agent.process(extraction_result)
        add_workflow_event(
            "Classifier",
            "Transactions categorized",
            "completed",
            f"Identified {len(classification_result.payload.tagged_transactions)} transaction categories"
        )

        # Reconciliation
        add_workflow_event(
            "Reconciliation",
            "Matching transactions",
            "in-progress",
            "Comparing source and destination records"
        )
        reconciliation_result = await reconciliation_agent.process(classification_result)
        add_workflow_event(
            "Reconciliation",
            "Transactions matched",
            "completed",
            f"Found {reconciliation_result.payload.metrics.get('match_count', 0)} matches and {reconciliation_result.payload.metrics.get('exception_count', 0)} exceptions"
        )

        # Exception Routing
        add_workflow_event(
            "Routing",
            "Processing exceptions",
            "in-progress",
            "Analyzing unmatched transactions"
        )
        routing_result = await routing_agent.process(reconciliation_result)
        add_workflow_event(
            "Routing",
            "Exceptions processed",
            "completed",
            f"Created {len(routing_result.payload.tickets_created)} tickets"
        )

        # Supervision & Reporting
        add_workflow_event(
            "Supervisor",
            "Generating reports",
            "in-progress",
            "Compiling reconciliation summary"
        )
        supervisor_result = await supervisor_agent.process(routing_result)
        add_workflow_event(
            "Supervisor",
            "Reports generated",
            "completed",
            "Final summary completed"
        )

        # Update job status
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['current_step'] = 'Pipeline Completed'
        jobs[job_id]['log'].append(f"Pipeline completed at {time.time()}")
        jobs[job_id]['results'] = {
            'extraction': extraction_result.payload.metrics,
            'classification': classification_result.payload.metrics,
            'reconciliation': reconciliation_result.payload.metrics,
            'routing': routing_result.payload.metrics,
            'summary': supervisor_result.payload.final_summary
        }
        jobs[job_id]['duration'] = time.time() - pipeline_start_time

    except Exception as e:
        logger.error(f"[Job {job_id}] Pipeline failed: {str(e)}", exc_info=True)
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['current_step'] = f'Error: {str(e)}'
        jobs[job_id]['log'].append(f"Pipeline failed at {time.time()}: {str(e)}")
        raise

    finally:
        # Clean up temporary files if any were saved
        temp_dir = f"temp_{job_id}"
        if os.path.exists(temp_dir):
             try:
                 shutil.rmtree(temp_dir)
                 logger.debug(f"[Job {job_id}] Removed temp directory: {temp_dir}")
             except OSError as rm_err:
                 logger.error(f"[Job {job_id}] Error removing temp directory {temp_dir}: {rm_err}")

# --- API Endpoints ---

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload files for reconciliation."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        # Create a new job entry
        job_id = str(uuid.uuid4())
        job = {
            "status": "running",
            "current_step": "File Upload",
            "start_time": datetime.now().isoformat(),
            "files": [],
            "error": None
        }
        jobs[job_id] = job

        # Process each file
        for file in files:
            try:
                # Create a temporary directory for this job
                temp_dir = os.path.join(tempfile.gettempdir(), f"reconai_{job_id}")
                os.makedirs(temp_dir, exist_ok=True)

                # Save file to temp directory
                file_id = str(uuid.uuid4())
                file_path = os.path.join(temp_dir, file.filename)
                
                with open(file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)

                # Store file info
                file_info = {
                    "id": file_id,
                    "name": file.filename,
                    "path": file_path,
                    "content_type": file.content_type,
                    "size": os.path.getsize(file_path)
                }
                uploaded_files[file_id] = file_path
                temp_files[file_path] = file_info

                # Extract headers and sample data
                headers, sample_data = extract_headers_and_sample(file_path)

                # Update job state
                job["files"].append({
                    "id": file_id,
                    "name": file.filename,
                    "headers": headers,
                    "sample_data": sample_data,
                    "path": file_path
                })

                # Add log entry with correct arguments
                add_workflow_event(
                    agent="file_uploader",
                    action="file_upload",
                    status="completed",
                    details={
                        "file_id": file_id,
                        "filename": file.filename,
                        "headers": headers
                    }
                )

                logger.info(f"Successfully processed file: {file.filename}")
                logger.info(f"Headers found: {headers}")

            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                job["error"] = f"Error processing file {file.filename}: {str(e)}"
                raise HTTPException(status_code=500, detail=str(e))

        # Update job state if we have 2 or more files
        if len(job["files"]) >= 2:
            job["current_step"] = "Header Mapping"
            add_workflow_event(
                agent="file_uploader",
                action="status_update",
                status="completed",
                details={
                    "message": "Files uploaded successfully, ready for header mapping",
                    "files": [f["name"] for f in job["files"]]
                }
            )

        return {
            "job_id": job_id,
            "files": [{"id": f["id"], "name": f["name"], "headers": f["headers"]} for f in job["files"]]
        }

    except Exception as e:
        logger.error(f"Error in upload_files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/configure")
async def configure_reconciliation(
    source_file: str = Form(...),
    target_file: str = Form(...),
    matching_headers: Dict[str, str] = Form(...),
    tolerance_rules: Dict[str, float] = Form(default_factory=dict)
):
    """Configure reconciliation with header mappings."""
    try:
        # Get the most recent job
        if not jobs:
            raise HTTPException(status_code=400, detail="No active job found")

        job_id = list(jobs.keys())[-1]
        job = jobs[job_id]

        # Validate files exist
        source_exists = any(f["name"] == source_file for f in job["files"])
        target_exists = any(f["name"] == target_file for f in job["files"])

        if not source_exists or not target_exists:
            raise HTTPException(status_code=400, detail="Source or target file not found in uploaded files")

        # Validate headers exist in files
        source_headers = next(f["headers"] for f in job["files"] if f["name"] == source_file)
        target_headers = next(f["headers"] for f in job["files"] if f["name"] == target_file)

        for source_header in matching_headers.keys():
            if source_header not in source_headers:
                raise HTTPException(status_code=400, detail=f"Source header '{source_header}' not found in source file")

        for target_header in matching_headers.values():
            if target_header not in target_headers:
                raise HTTPException(status_code=400, detail=f"Target header '{target_header}' not found in target file")

        # Create configuration
        config = {
            "source_file": source_file,
            "target_file": target_file,
            "matching_headers": matching_headers,
            "tolerance_rules": tolerance_rules
        }

        # Update job state
        job["matching_headers"] = matching_headers
        job["current_step"] = "Data Extraction"
        job["config"] = config

        # Add log entry
        add_workflow_event(
            agent="configurator",
            action="header_mapping",
            status="completed",
            details={
                "mappings": matching_headers
            }
        )

        return {"status": "success", "message": "Reconciliation configured successfully"}

    except Exception as e:
        logger.error(f"Error in configure_reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reconcile/configure")
async def configure_reconciliation(
    source_file: str = Form(...),
    target_file: str = Form(...),
    matching_headers: str = Form(...)
):
    """
    Configure the reconciliation process with source and target files and header mappings.
    """
    try:
        # Parse the matching headers from the form data
        matching_headers_dict = json.loads(matching_headers)
        
        # Validate that both files exist
        if source_file not in uploaded_files:
            raise HTTPException(status_code=404, detail=f"Source file {source_file} not found")
        if target_file not in uploaded_files:
            raise HTTPException(status_code=404, detail=f"Target file {target_file} not found")
        
        # Validate that all source headers exist in the source file
        source_headers = file_headers[source_file].headers
        for source_header in matching_headers_dict.keys():
            if source_header not in source_headers:
                raise HTTPException(
                    status_code=422,
                    detail=f"Source header {source_header} not found in source file"
                )
        
        # Validate that all target headers exist in the target file
        target_headers = file_headers[target_file].headers
        for target_header in matching_headers_dict.values():
            if target_header not in target_headers:
                raise HTTPException(
                    status_code=422,
                    detail=f"Target header {target_header} not found in target file"
                )
        
        # Create a configuration object
        config = {
            "source_file": source_file,
            "target_file": target_file,
            "matching_headers": matching_headers_dict,
            "source_headers": source_headers,
            "target_headers": target_headers,
            "source_sample_data": file_headers[source_file].sampleData,
            "target_sample_data": file_headers[target_file].sampleData
        }

        # Update job state
        job_id = list(jobs.keys())[-1]  # Get the most recent job
        jobs[job_id]["matching_headers"] = matching_headers_dict
        jobs[job_id]["current_step"] = "Data Extraction"
        jobs[job_id]["status"] = "running"
        jobs[job_id]["log"].append("Header mapping completed successfully")
        
        return {"config": config}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid matching_headers format")
    except Exception as e:
        logger.error(f"Error configuring reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_temp_file_path(file_id: str) -> str:
    """
    Get the temporary file path for a given file ID.
    This could be the original filename, a UUID, or a full path.
    """
    logger.info(f"Looking for file with ID: {file_id}")
    
    # First, check if it's a direct file path that exists
    if os.path.isfile(file_id):
        logger.info(f"Found file directly at path: {file_id}")
        return file_id
    
    # Check in uploaded_files dictionary
    if file_id in uploaded_files:
        path = uploaded_files[file_id]
        logger.info(f"Found file ID in uploaded_files mapping: {path}")
        if os.path.isfile(path):
            return path
        else:
            logger.warning(f"Path from uploaded_files exists in dictionary but not on disk: {path}")
    
    # Check in temp_files dictionary
    for file_path, file_info in temp_files.items():
        if file_info.get("id") == file_id:
            logger.info(f"Found file ID in temp_files: {file_path}")
            if os.path.isfile(file_path):
                return file_path
            else:
                logger.warning(f"Path from temp_files exists in dictionary but not on disk: {file_path}")
    
    # Check if any path in temp_files matches our filename
    basename = os.path.basename(file_id)
    logger.info(f"Trying to match by basename: {basename}")
    
    for file_path, file_info in temp_files.items():
        if file_info.get("name") == basename:
            logger.info(f"Found basename match in temp_files: {file_path}")
            if os.path.isfile(file_path):
                return file_path
            else:
                logger.warning(f"Path from basename match exists in dictionary but not on disk: {file_path}")
    
    # If we get here, we couldn't find the file
    logger.error(f"File with ID {file_id} not found. Available files in uploaded_files: {uploaded_files}")
    logger.error(f"Available files in temp_files: {list(temp_files.keys())}")
    logger.error(f"Available jobs: {[job.get('files') for job in jobs.values()]}")
    
    raise ValueError(f"File with ID {file_id} not found")

@app.post("/api/reconcile")
async def start_reconciliation(
    source_file: str = Form(...),
    target_file: str = Form(...),
    matching_headers: str = Form(...),
    tolerance_rules: Optional[str] = Form(None)
):
    try:
        # Parse JSON strings from form data
        matching_headers_dict = json.loads(matching_headers)
        tolerance_rules_dict = json.loads(tolerance_rules) if tolerance_rules else None
        
        logger.info(f"Received reconciliation request with source: {source_file}, target: {target_file}")
        logger.info(f"Available uploaded files: {uploaded_files}")
        logger.info(f"Available temp files: {list(temp_files.keys())}")
        
        # Get file paths from temporary storage
        try:
            source_path = get_temp_file_path(source_file)
            logger.info(f"Source file path resolved to: {source_path}")
        except ValueError as e:
            logger.error(f"Could not find source file: {e}")
            raise HTTPException(status_code=404, detail=f"Source file not found: {str(e)}")
            
        try:
            target_path = get_temp_file_path(target_file)
            logger.info(f"Target file path resolved to: {target_path}")
        except ValueError as e:
            logger.error(f"Could not find target file: {e}")
            raise HTTPException(status_code=404, detail=f"Target file not found: {str(e)}")
        
        # Verify files exist on disk
        if not os.path.exists(source_path):
            logger.error(f"Source path {source_path} does not exist on disk")
            raise HTTPException(status_code=404, detail=f"Source file not found on disk: {source_path}")
        
        if not os.path.exists(target_path):
            logger.error(f"Target path {target_path} does not exist on disk")
            raise HTTPException(status_code=404, detail=f"Target file not found on disk: {target_path}")
        
        # Create a unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job state
        job_state = {
            "job_id": job_id,
            "status": "pending",
            "current_step": "Starting",
            "start_time": time.time(),  # Store as timestamp
            "source_file": source_file,
            "target_file": target_file,
            "source_path": source_path,
            "target_path": target_path,
            "matching_headers": matching_headers_dict,
            "tolerance_rules": tolerance_rules_dict or {},
            "files": [],
            "log": [],
            "error": None,
            "results": {}
        }
        
        # Store job state
        jobs[job_id] = job_state
        
        # Start reconciliation process in background
        asyncio.create_task(process_reconciliation(job_id))
        
        return {"job_id": job_id}
        
    except Exception as e:
        logger.error(f"Error starting reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_reconciliation(job_id: str):
    try:
        job = jobs[job_id]
        job["status"] = "processing"
        job["current_step"] = "Reading Files"
        job["start_time"] = time.time()  # Ensure consistent timestamp format
        
        # Use the resolved paths directly from the job state
        source_path = job["source_path"]
        target_path = job["target_path"]
        
        logger.info(f"Reading source file from: {source_path}")
        logger.info(f"Reading target file from: {target_path}")
        
        # Read files with specified headers
        try:
            source_df = pd.read_excel(source_path)
        except Exception as e:
            logger.error(f"Error reading source file: {str(e)}")
            job["status"] = "failed"
            job["error"] = f"Error reading source file: {str(e)}"
            job["current_step"] = "Failed"
            return
            
        try:
            target_df = pd.read_excel(target_path)
        except Exception as e:
            logger.error(f"Error reading target file: {str(e)}")
            job["status"] = "failed"
            job["error"] = f"Error reading target file: {str(e)}"
            job["current_step"] = "Failed"
            return
        
        # Apply header mappings
        source_headers = list(job["matching_headers"].keys())
        target_headers = list(job["matching_headers"].values())
        
        # Ensure all mapped headers exist
        missing_source_headers = [h for h in source_headers if h not in source_df.columns]
        missing_target_headers = [h for h in target_headers if h not in target_df.columns]
        
        if missing_source_headers or missing_target_headers:
            raise ValueError(
                f"Missing headers in files: "
                f"Source: {missing_source_headers}, "
                f"Target: {missing_target_headers}"
            )
        
        # Select only the mapped columns
        source_df = source_df[source_headers]
        target_df = target_df[target_headers]
        
        # Rename columns to match
        source_df.columns = [f"source_{h}" for h in source_headers]
        target_df.columns = [f"target_{h}" for h in target_headers]
        
        # Process reconciliation
        job["current_step"] = "Processing Reconciliation"
        
        # Your reconciliation logic here
        # For example:
        matches = []
        exceptions = []
        
        # Update job state
        job["status"] = "completed"
        job["current_step"] = "Completed"
        job["results"] = {
            "matches": matches,
            "exceptions": exceptions
        }
        
    except Exception as e:
        logger.error(f"Error processing reconciliation job {job_id}: {str(e)}")
        job["status"] = "failed"
        job["error"] = str(e)
        job["current_step"] = "Failed"

def extract_headers_and_sample(file_path: str) -> tuple[List[str], Dict[str, List[str]]]:
    """
    Extract headers and sample data from a file.
    Supports Excel, CSV, TSV, and other delimited text formats.
    """
    headers = []
    sample_data = {}
    
    try:
        # Check if file exists and has content
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            raise ValueError("File is empty or does not exist")
            
        # Check file extension
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # Try specialized approaches based on file extension
        if file_ext in ['.xlsx', '.xls', '.xlsb']:
            logger.info(f"Processing Excel file with extension {file_ext}")
            
            if file_ext == '.xlsx':
                # Modern Excel (.xlsx)
                try:
                    df = pd.read_excel(file_path, engine='openpyxl', nrows=6)
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
                except Exception as e:
                    logger.warning(f"Failed to read .xlsx with openpyxl: {str(e)}")
                    
            elif file_ext == '.xls':
                # Legacy Excel (.xls)
                try:
                    df = pd.read_excel(file_path, engine='xlrd', nrows=6)
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
                except Exception as e:
                    logger.warning(f"Failed to read .xls with xlrd: {str(e)}")
                    
            elif file_ext == '.xlsb':
                # Binary Excel (.xlsb)
                try:
                    df = pd.read_excel(file_path, engine='pyxlsb', nrows=6)
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
                except Exception as e:
                    logger.warning(f"Failed to read .xlsb with pyxlsb: {str(e)}")
        
            # If we get here, try the generic Excel approach as fallback
            try:
                # Generic Excel approach (let pandas choose the engine)
                df = pd.read_excel(file_path, nrows=6)
                headers = list(df.columns)
                for col in headers:
                    sample_data[col] = df[col].head().astype(str).tolist()
                return headers, sample_data
            except Exception as e:
                logger.warning(f"Failed to read Excel with generic approach: {str(e)}")
                raise ValueError(f"Could not read Excel file: {str(e)}")
        
        # For CSV/TSV/text files
        elif file_ext in ['.csv', '.tsv', '.txt']:
            logger.info(f"Processing text file with extension {file_ext}")
            
            # Choose default delimiter based on extension
            default_delimiter = '\t' if file_ext == '.tsv' else ','
            
            try:
                # Try with the default delimiter first
                df = pd.read_csv(file_path, delimiter=default_delimiter, nrows=6, encoding_errors='replace')
                headers = list(df.columns)
                for col in headers:
                    sample_data[col] = df[col].head().astype(str).tolist()
                return headers, sample_data
            except Exception as e:
                logger.warning(f"Failed to read with default delimiter: {str(e)}")
                
                # Try with pandas auto-detection
                try:
                    df = pd.read_csv(file_path, engine='python', nrows=6, encoding_errors='replace')
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
                except Exception as e:
                    logger.warning(f"Failed to read with pandas auto-detection: {str(e)}")
        
        # Unknown file type - try all approaches
        else:
            logger.info(f"Processing unknown file type with extension {file_ext}")
            
            # Try all Excel engines
            for engine in ['openpyxl', 'xlrd', 'pyxlsb']:
                try:
                    df = pd.read_excel(file_path, engine=engine, nrows=6)
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
                except Exception as e:
                    logger.debug(f"Failed to read with Excel engine {engine}: {str(e)}")
        
        # Try various CSV formats with different delimiters
        delimiters = [',', '\t', ';', '|']
        for delimiter in delimiters:
            try:
                df = pd.read_csv(file_path, delimiter=delimiter, nrows=6, encoding_errors='replace')
                if len(df.columns) > 1:  # Found a workable delimiter
                    headers = list(df.columns)
                    for col in headers:
                        sample_data[col] = df[col].head().astype(str).tolist()
                    return headers, sample_data
            except Exception as e:
                logger.debug(f"Failed to read with delimiter '{delimiter}': {str(e)}")
        
        # Last resort: Try pandas csv with automatic delimiter detection
        try:
            df = pd.read_csv(file_path, engine='python', encoding_errors='replace', nrows=6)
            headers = list(df.columns)
            for col in headers:
                sample_data[col] = df[col].head().astype(str).tolist()
            return headers, sample_data
        except Exception as e:
            logger.warning(f"Failed to read with automatic delimiter detection: {str(e)}")
        
        # If all else fails, try as simple text file
        try:
            with open(file_path, 'r', errors='replace') as f:
                lines = [line.strip() for line in f.readlines()[:6]]
                if lines:
                    headers = ['Content']
                    sample_data['Content'] = lines
                    return headers, sample_data
        except Exception as e:
            logger.warning(f"Failed to read as text file: {str(e)}")
            
        raise ValueError("Could not extract headers or content from file using any supported method")
            
    except Exception as e:
        logger.error(f"Error extracting headers from {file_path}: {str(e)}")
        raise ValueError(f"Failed to extract headers: {str(e)}")
    
    if not headers:
        raise ValueError("No headers found in file")
    
    return headers, sample_data

@app.get("/api/reconcile/status/{job_id}")
async def get_reconciliation_status(job_id: str = Path(..., description="The ID of the job to check.")):
    """
    Gets the current status, step, and log/results of a specific reconciliation job.
    """
    try:
        logger.debug(f"Request received for status of job {job_id}")
        job = jobs.get(job_id)
        if not job:
            logger.warning(f"Job ID {job_id} not found.")
            raise HTTPException(status_code=404, detail="Job not found")

        # Calculate duration if job has started
        duration_seconds = None
        if job.get("start_time"):
            try:
                start_time = job.get("start_time")
                if isinstance(start_time, (int, float)):
                    # Calculate duration from timestamp
                    duration_seconds = time.time() - start_time
                else:
                    logger.warning(f"Unexpected start_time type: {type(start_time)}")
                    duration_seconds = None
            except Exception as e:
                logger.warning(f"Error calculating duration: {str(e)}")
                duration_seconds = None

        # Return relevant status information
        return {
            "id": job_id,
            "status": job.get("status", "unknown"),
            "current_step": job.get("current_step", "unknown"),
            "start_time": job.get("start_time"),
            "duration_seconds": duration_seconds,
            "files": job.get("files", []),
            "log": job.get("log", []),
            "error": job.get("error"),
            "results": job.get("results", {})
        }
    except Exception as e:
        logger.error(f"Error getting status for job {job_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics")
async def get_system_metrics():
     """Returns overall system metrics."""
     statuses = [j['status'] for j in jobs.values()]
     return {
         "total_jobs": len(jobs), "jobs_pending": statuses.count('pending'),
         "jobs_running": statuses.count('running'), "jobs_completed": statuses.count('completed'),
         "jobs_failed": statuses.count('failed'),
     }

@app.get("/api/workflow/status")
async def get_workflow_status():
    """Get the current workflow status."""
    try:
        # Get the most recent job
        if not jobs:
            return {
                "status": "idle",
                "current_step": "No active jobs",
                "progress": 0,
                "error": None,
                "steps": [
                    {"name": "File Upload", "status": "pending"},
                    {"name": "Header Mapping", "status": "pending"},
                    {"name": "Data Extraction", "status": "pending"},
                    {"name": "Reconciliation", "status": "pending"},
                    {"name": "Results", "status": "pending"}
                ]
            }

        # Get the most recent job
        job_id = list(jobs.keys())[-1]
        job = jobs[job_id]

        # Initialize steps
        steps = [
            {"name": "File Upload", "status": "pending"},
            {"name": "Header Mapping", "status": "pending"},
            {"name": "Data Extraction", "status": "pending"},
            {"name": "Reconciliation", "status": "pending"},
            {"name": "Results", "status": "pending"}
        ]

        # Calculate progress and update step statuses
        progress = 0
        current_step = "No active jobs"
        status = "idle"

        # Check if files are uploaded
        if job.get("files") and len(job["files"]) >= 2:
            steps[0]["status"] = "completed"
            progress = 20
            current_step = "File Upload"
            status = "running"

        # Check if headers are mapped
        if job.get("matching_headers") and len(job["matching_headers"]) > 0:
            steps[1]["status"] = "completed"
            progress = 40
            current_step = "Header Mapping"
            status = "running"

        # Update based on current step
        if job.get("current_step"):
            current_step = job["current_step"]
            if current_step == "Reading Files":
                steps[2]["status"] = "in-progress"
                progress = 60
            elif current_step == "Processing Reconciliation":
                steps[2]["status"] = "completed"
                steps[3]["status"] = "in-progress"
                progress = 80
            elif current_step == "Completed":
                steps[3]["status"] = "completed"
                steps[4]["status"] = "completed"
                progress = 100
                status = "completed"
            elif current_step == "Error":
                for step in steps:
                    if step["status"] == "in-progress":
                        step["status"] = "error"
                status = "error"

        return {
            "status": status,
            "current_step": current_step,
            "progress": progress,
            "error": job.get("error"),
            "steps": steps
        }

    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        return {
            "status": "error",
            "current_step": "Error",
            "progress": 0,
            "error": str(e),
            "steps": [
                {"name": "File Upload", "status": "error"},
                {"name": "Header Mapping", "status": "error"},
                {"name": "Data Extraction", "status": "error"},
                {"name": "Reconciliation", "status": "error"},
                {"name": "Results", "status": "error"}
            ]
        }

# --- Run the API server ---
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ReconAI API server (AA Protocol version)...")
    # Ensure LLM client loaded if possible
    if not llm:
         logger.warning("Running API server without a functional LLM Client.")
    uvicorn.run(app, host="0.0.0.0", port=8000)