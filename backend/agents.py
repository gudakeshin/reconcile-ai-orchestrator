import time
import random
import logging
import os
import re
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple

# Assuming llm_client.py and data_models.py exist in the same directory
from llm_client import LLMClient
from data_models import (
    RawTransaction, CleansedTransaction, TaggedTransaction,
    MatchResult, ExceptionRecord, Ticket, AgentMetrics,
    AAMessage, ExtractionRequestPayload, ExtractionResultPayload,
    ClassificationRequestPayload, ClassificationResultPayload,
    ReconciliationRequestPayload, ReconciliationResultPayload,
    RoutingRequestPayload, RoutingResultPayload,
    SummaryRequestPayload, SummaryResultPayload,
    FileInfo
)
from workflow_events import add_workflow_event

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BaseAgent:
    """Base class for all agents."""
    def __init__(self, llm_client, agent_name: str):
        self.llm_client = llm_client
        self.agent_name = agent_name
        self.status = "idle"
        logger.info(f"Initializing {self.agent_name}...")
        if not llm_client:
             logger.warning(f"LLM Client not provided or unavailable for {self.agent_name}")

    def emit_workflow_event(self, action: str, status: str, details: str):
        """Emit a workflow event for this agent."""
        add_workflow_event(self.agent_name, action, status, details)

    def get_metrics(self) -> Dict[str, Any]:
        """Placeholder for agent-specific metrics."""
        return {"processed_count": 0, "error_count": 0, "avg_latency_ms": 0}

# --- Agent Implementations (Modified for API workflow) ---

class DataExtractionCleansingAgent(BaseAgent):
    """Agent 1: Modified to process pre-uploaded files."""
    def __init__(self, llm_client, uploaded_files_info: List[Dict]):
        super().__init__(llm_client, "data_extraction_agent")
        # Convert to FileInfo objects if needed
        self.uploaded_files_info = [
            FileInfo(**file_info) if isinstance(file_info, dict) else file_info
            for file_info in uploaded_files_info
        ]
        self.processed_count = 0
        self.error_count = 0
        self.duplicate_count = 0
        self.records_ingested = 0

    async def process(self, message: AAMessage) -> AAMessage:
        try:
            self.emit_workflow_event("start", "running", "Starting data extraction and cleansing")
            logger.info(f"[{self.agent_name}] Starting data extraction with {len(self.uploaded_files_info)} files")
            
            # Process the files and extract data
            raw_transactions = self.read_and_parse_files()
            logger.info(f"[{self.agent_name}] Extracted {len(raw_transactions)} raw transactions")
            
            cleansed_list = []
            for raw_tx in raw_transactions:
                cleansed = self.validate_and_standardize(raw_tx)
                if cleansed:
                    cleansed_list.append(cleansed)

            logger.info(f"[{self.agent_name}] Cleansed {len(cleansed_list)} transactions")
            unique_cleansed_list = self.remove_duplicates(cleansed_list)
            self.processed_count = len(unique_cleansed_list) # Set final processed count after dedupe
            
            # Create metrics
            metrics = {
                "files_processed": len(self.uploaded_files_info),
                "records_ingested": self.records_ingested,
                "records_validated_after_dedupe": self.processed_count,
                "validation_errors": self.error_count,
                "duplicates_removed": self.duplicate_count
            }
            
            logger.info(f"[{self.agent_name}] Completed processing with metrics: {metrics}")
            self.emit_workflow_event("complete", "success", f"Data extraction and cleansing completed successfully. Processed {self.processed_count} records.")
            return AAMessage(
                sender_id=self.agent_name,
                receiver_id="classifier_agent",
                message_type="data_cleansed",
                payload=ExtractionResultPayload(
                    cleansed_transactions=unique_cleansed_list,
                    metrics=metrics
                )
            )
        except Exception as e:
            logger.error(f"[{self.agent_name}] Error during processing: {str(e)}", exc_info=True)
            self.emit_workflow_event("error", "failed", f"Data extraction and cleansing failed: {str(e)}")
            raise

    def read_and_parse_files(self) -> List[RawTransaction]:
        """Reads data from the temporary files."""
        raw_transactions = []
        logger.info(f"[{self.agent_name}] Reading {len(self.uploaded_files_info)} uploaded files...")
        
        for file_info in self.uploaded_files_info:
            try:
                logger.info(f"[{self.agent_name}] Starting to process file: {file_info.original_filename}")
                
                if not os.path.exists(file_info.temp_path):
                    logger.error(f"[{self.agent_name}] File not found at path: {file_info.temp_path}")
                    self.error_count += 1
                    continue
                
                # Process Excel files
                if file_info.original_filename.lower().endswith(('.xlsx', '.xls')):
                    try:
                        logger.info(f"[{self.agent_name}] Reading Excel file: {file_info.original_filename}")
                        df = pd.read_excel(file_info.temp_path)
                        
                        # Convert column names to lowercase and strip whitespace
                        df.columns = [str(col).strip().lower() for col in df.columns]
                        
                        # Log headers and their potential matches
                        headers = df.columns.tolist()
                        if headers:
                            logger.info(f"[{self.agent_name}] Found headers in {file_info.original_filename}: {headers}")
                            
                            # Identify similar headers
                            similar_headers = {}
                            for header in headers:
                                similar_headers[header] = self.find_similar_headers(header, headers)
                            
                            # Store header information in file_info
                            file_info.header_matches = similar_headers
                            
                        else:
                            logger.error(f"[{self.agent_name}] No headers found in Excel file: {file_info.original_filename}")
                            continue
                        
                        # Process rows
                        for idx, row in df.iterrows():
                            # Convert row to dictionary and clean values
                            cleaned_row = {}
                            for col in headers:
                                value = row[col]
                                if pd.notna(value):  # Only add non-null values
                                    if isinstance(value, str):
                                        value = value.strip()
                                        if value:  # Only add non-empty strings
                                            cleaned_row[col] = value
                                    else:
                                        cleaned_row[col] = value
                            
                            if cleaned_row:  # Only add non-empty rows
                                raw_tx = RawTransaction(
                                    source=file_info.original_filename,
                                    data=cleaned_row,
                                    id=f"{file_info.original_filename}_{idx + 1}"
                                )
                                raw_transactions.append(raw_tx)
                        
                        file_records = len(df)
                        logger.info(f"[{self.agent_name}] Successfully parsed {file_records} records from Excel file: {file_info.original_filename}")
                        
                    except Exception as e:
                        logger.exception(f"[{self.agent_name}] Failed to parse Excel file {file_info.original_filename}: {e}")
                        self.error_count += 1
                        continue
                
                # Process CSV files
                elif file_info.original_filename.lower().endswith('.csv'):
                    try:
                        # Read a sample for dialect detection
                        with open(file_info.temp_path, 'r', encoding=file_info.encoding, errors='replace') as f:
                            sample = f.read(2048)
                            f.seek(0)  # Reset file pointer after reading sample
                            
                            # Try to detect dialect
                            try:
                                dialect = csv.Sniffer().sniff(sample)
                                has_header = csv.Sniffer().has_header(sample)
                                logger.info(f"[{self.agent_name}] CSV analysis for {file_info.original_filename}:")
                                logger.info(f"  - Detected delimiter: '{dialect.delimiter}'")
                                logger.info(f"  - Has header: {has_header}")
                            except csv.Error as e:
                                logger.warning(f"[{self.agent_name}] CSV dialect detection failed for {file_info.original_filename}: {e}")
                                logger.warning(f"[{self.agent_name}] Falling back to default comma delimiter")
                                dialect = csv.excel
                                has_header = True  # Assume headers by default
                            
                            # Create CSV reader
                            reader = csv.DictReader(f, dialect=dialect) if has_header else csv.reader(f, dialect=dialect)
                            
                            # If using reader (no headers), create column names
                            if not has_header:
                                headers = [f"column_{i+1}" for i in range(len(next(reader)))]
                                f.seek(0)  # Reset to start
                                reader = csv.DictReader(f, fieldnames=headers, dialect=dialect)
                            
                            # Log headers
                            headers = reader.fieldnames
                            if headers:
                                logger.info(f"[{self.agent_name}] Found headers in {file_info.original_filename}: {headers}")
                            else:
                                logger.error(f"[{self.agent_name}] No headers found in CSV file: {file_info.original_filename}")
                                continue
                            
                            # Process rows
                            line_num = 1
                            for row in reader:
                                # Clean keys and values
                                cleaned_row = {}
                                for k, v in row.items():
                                    if k and v:
                                        key = k.strip().lower()
                                        value = v.strip() if isinstance(v, str) else v
                                        if isinstance(v, str):
                                            if value:  # Only add non-empty strings
                                                cleaned_row[key] = value
                                        else:
                                            cleaned_row[key] = value  # Keep non-string values as is
                                
                                if cleaned_row:  # Only add non-empty rows
                                    raw_tx = RawTransaction(
                                        source=file_info.original_filename,
                                        data=cleaned_row,
                                        id=f"{file_info.original_filename}_{line_num}"
                                    )
                                    raw_transactions.append(raw_tx)
                                    line_num += 1
                                else:
                                    logger.debug(f"[{self.agent_name}] Skipping empty row {line_num} in {file_info.original_filename}")
                            
                            file_records = line_num - 1
                            logger.info(f"[{self.agent_name}] Successfully parsed {file_records} records from CSV file: {file_info.original_filename}")
                            
                    except Exception as e:
                        logger.exception(f"[{self.agent_name}] Failed to parse CSV file {file_info.original_filename}: {e}")
                        self.error_count += 1
                        continue
                
                # Process TXT files
                elif file_info.original_filename.lower().endswith('.txt'):
                    logger.info(f"[{self.agent_name}] Parsing TXT file: {file_info.original_filename}")
                    line_num = 1
                    with open(file_info.temp_path, 'r', encoding=file_info.encoding, errors='replace') as f:
                        for line in f:
                            line = line.strip()
                            if line:  # Only process non-empty lines
                                # Split line by whitespace or tab
                                parts = line.split()
                                if len(parts) >= 2:  # At least 2 columns
                                    cleaned_row = {
                                        'column_1': parts[0],
                                        'column_2': parts[1]
                                    }
                                    if len(parts) > 2:
                                        cleaned_row['column_3'] = parts[2]
                                    
                                    raw_tx = RawTransaction(
                                        source=file_info.original_filename,
                                        data=cleaned_row,
                                        id=f"{file_info.original_filename}_{line_num}"
                                    )
                                    raw_transactions.append(raw_tx)
                            line_num += 1
                    
                    file_records = line_num - 1
                    logger.info(f"[{self.agent_name}] Successfully parsed {file_records} records from TXT file: {file_info.original_filename}")
                
                else:
                    logger.warning(f"[{self.agent_name}] Unsupported file type: {file_info.original_filename}")
                    continue
                
                self.records_ingested += file_records
                
            except Exception as e:
                logger.exception(f"[{self.agent_name}] Error processing file {file_info.original_filename}: {e}")
                self.error_count += 1
                continue
        
        logger.info(f"[{self.agent_name}] Total records ingested: {self.records_ingested}")
        return raw_transactions

    def validate_and_standardize(self, raw_tx: RawTransaction) -> Optional[CleansedTransaction]:
        """Validate schema, cleanse, and standardize."""
        logger.debug(f"[{self.agent_name}] Validating/Standardizing: {raw_tx.id}")
        processing_log = [f"Received from {raw_tx.source}"]
        normalized = {}
        valid = True
        missing_fields = []

        try:
            data = raw_tx.data
            
            # Get all available fields from the data
            available_fields = [k.lower() for k, v in data.items() if v is not None and str(v).strip()]
            logger.info(f"[{self.agent_name}] Available fields in {raw_tx.source}: {available_fields}")
            
            # Try to identify key fields based on content patterns
            id_val = None
            currency_val = None
            amount_str = None
            date_val = None
            desc_val = None
            
            # Analyze each field to determine its type
            field_types = {}
            for field, value in data.items():
                if value is None or not str(value).strip():
                    continue
                    
                value_str = str(value).strip()
                field_lower = field.lower()
                
                # Check for ID-like fields with more flexible patterns
                if (field_lower in ['id', 'transactionid', 'ref', 'record_id', 'transaction_id', 'txn_id', 'reference', 'ref_no'] or
                    any(pattern in field_lower for pattern in ['id', 'ref', 'txn', 'record', 'number', 'no', 'num'])):
                    id_val = value_str
                    field_types[field] = 'id'
                    
                # Check for currency-like fields with more flexible patterns
                elif (field_lower in ['currency', 'ccy', 'cur', 'curr', 'currency_code', 'currencycode'] or
                      any(pattern in field_lower for pattern in ['curr', 'ccy', 'currency'])):
                    currency_val = value_str
                    field_types[field] = 'currency'
                    
                # Check for amount-like fields
                elif (field_lower in ['amount', 'value', 'amt', 'debit', 'credit', 'transaction_amount', 'txn_amount'] or
                      any(pattern in field_lower for pattern in ['amt', 'value'])):
                    amount_str = value_str
                    field_types[field] = 'amount'
                    
                # Check for date-like fields
                elif (field_lower in ['date', 'valuedate', 'val_date', 'transaction date', 'dt', 'txn_date', 'transaction_date'] or
                      any(pattern in field_lower for pattern in ['date', 'dt'])):
                    date_val = value_str
                    field_types[field] = 'date'
                    
                # Check for description-like fields
                elif (field_lower in ['description', 'desc', 'info', 'notes', 'details', 'transaction_description', 'txn_desc'] or
                      any(pattern in field_lower for pattern in ['desc', 'info', 'notes'])):
                    desc_val = value_str
                    field_types[field] = 'description'
                    
                # If field type is not determined, try to infer it
                else:
                    # Try to infer field type based on value content
                    if value_str.replace('.', '').replace('-', '').isdigit():
                        field_types[field] = 'numeric'
                    elif len(value_str) == 3 and value_str.isalpha():
                        field_types[field] = 'currency'
                    elif any(char.isdigit() for char in value_str) and any(char.isalpha() for char in value_str):
                        field_types[field] = 'mixed'
                    else:
                        field_types[field] = 'text'

            # Log identified field types
            logger.info(f"[{self.agent_name}] Identified field types: {field_types}")
            
            # Validate and normalize fields with more flexible matching
            if id_val is None:
                # Try to find a suitable ID field from the available fields
                potential_id_fields = [f for f, t in field_types.items() if t in ['id', 'numeric', 'mixed']]
                if potential_id_fields:
                    # Sort by confidence (id type first, then numeric, then mixed)
                    potential_id_fields.sort(key=lambda x: 
                        0 if field_types[x] == 'id' else 
                        1 if field_types[x] == 'numeric' else 2)
                    id_val = data[potential_id_fields[0]]
                    processing_log.append(f"Using '{potential_id_fields[0]}' as ID field")
                else:
                    valid = False
                    missing_fields.append("ID")
                    processing_log.append("WARN: No suitable ID field found. Please ensure your data has a unique identifier field.")
            
            if currency_val is None:
                # Try to find a suitable currency field from the available fields
                potential_currency_fields = [f for f, t in field_types.items() if t in ['currency', 'text']]
                if potential_currency_fields:
                    # Sort by confidence (currency type first, then text)
                    potential_currency_fields.sort(key=lambda x: 
                        0 if field_types[x] == 'currency' else 1)
                    currency_val = data[potential_currency_fields[0]]
                    processing_log.append(f"Using '{potential_currency_fields[0]}' as currency field")
                else:
                    valid = False
                    missing_fields.append("Currency")
                    processing_log.append("WARN: No suitable currency field found. Please ensure your data has a currency field.")

            # Normalize the identified fields
            if id_val is not None:
                normalized['id'] = str(id_val).strip()
            if currency_val is not None:
                normalized['currency'] = str(currency_val).strip().upper()
            if amount_str is not None:
                try:
                    amount_str_cleaned = ''.join(filter(lambda x: x.isdigit() or x in ['.', '-'], str(amount_str)))
                    normalized['amount'] = float(amount_str_cleaned) if amount_str_cleaned else 0.0
                except ValueError:
                    normalized['amount'] = 0.0
                    processing_log.append(f"WARN: Could not parse amount from '{amount_str}'")
            if date_val is not None:
                normalized['date'] = str(date_val).strip()
            if desc_val is not None:
                normalized['description'] = str(desc_val).strip()

            # Add all other fields to normalized data
            for field, value in data.items():
                if field not in normalized and value is not None:
                    normalized[field] = str(value).strip()

            # Add field analysis to processing log
            processing_log.append(f"Field analysis: {field_types}")
            processing_log.append(f"Available fields: {available_fields}")

        except Exception as e:
            valid = False
            processing_log.append(f"ERROR: Exception during standardization - {e}")
            logger.error(f"[{self.agent_name}] Error processing {raw_tx.id}: {e}")

        if valid:
            processing_log.append("Standardization and Validation Passed.")
            cleansed_tx = CleansedTransaction(
                original_id=raw_tx.id,
                source=raw_tx.source,
                normalized_data=normalized,
                validation_status="Passed",
                processing_log=processing_log
            )
            logger.debug(f"[{self.agent_name}] Cleansed: {cleansed_tx.id}")
            return cleansed_tx
        else:
            logger.warning(f"[{self.agent_name}] Validation Failed for {raw_tx.id}. Log: {processing_log}")
            self.error_count += 1
            return None

    def remove_duplicates(self, transactions: List[CleansedTransaction]) -> List[CleansedTransaction]:
        """Placeholder: Simple duplicate removal based on key fields. (Same as before)"""
        logger.info(f"[{self.agent_name}] Checking for duplicates in {len(transactions)} records...")
        seen = set()
        unique_transactions = []
        duplicates_found = 0
        for tx in transactions:
            # Define a unique key (e.g., based on amount, date, currency, part of description)
            # Make key more robust
            key = (
                tx.normalized_data.get('date'),
                tx.normalized_data.get('currency'),
                # Round amount to handle minor variations if needed, e.g., round(tx.normalized_data.get('amount', 0), 2)
                tx.normalized_data.get('amount', 0),
                # Use normalized description, maybe first N chars
                tx.normalized_data.get('description', '')[:30].lower()
            )
            if key not in seen:
                seen.add(key)
                unique_transactions.append(tx)
            else:
                duplicates_found += 1
                tx.processing_log.append("Flagged as potential duplicate.")
                logger.warning(f"[{self.agent_name}] Potential duplicate detected and removed: {tx.id} (key: {key})")
                # Decide handling: skip, mark, etc. Here we skip adding it to unique list.
        self.duplicate_count = duplicates_found
        logger.info(f"[{self.agent_name}] Identified and removed {duplicates_found} potential duplicates.")
        return unique_transactions

    def find_similar_headers(self, header: str, all_headers: List[str]) -> List[Dict[str, Any]]:
        """Finds similar headers based on common patterns and naming conventions."""
        similar = []
        header_lower = header.lower()
        
        # Common header patterns and their variations
        patterns = {
            'id': ['id', 'transactionid', 'ref', 'record_id', 'transaction_id', 'txn_id'],
            'amount': ['amount', 'value', 'amt', 'debit', 'credit'],
            'currency': ['currency', 'ccy', 'cur', 'curr'],
            'date': ['date', 'valuedate', 'val_date', 'transaction date', 'dt'],
            'description': ['description', 'desc', 'info', 'notes', 'details']
        }
        
        # Check if header matches any pattern
        for pattern, variations in patterns.items():
            if header_lower in variations:
                # Find other headers that match the same pattern
                for other_header in all_headers:
                    if other_header != header and other_header.lower() in variations:
                        similar.append({
                            'header': other_header,
                            'pattern': pattern,
                            'confidence': 1.0,
                            'recommended': True
                        })
        
        # If no pattern match found, use string similarity
        if not similar:
            for other_header in all_headers:
                if other_header != header:
                    # Calculate string similarity
                    similarity = self.calculate_string_similarity(header_lower, other_header.lower())
                    if similarity > 0.7:  # Threshold for similarity
                        similar.append({
                            'header': other_header,
                            'pattern': 'unknown',
                            'confidence': similarity,
                            'recommended': similarity > 0.8
                        })
        
        return similar

    def calculate_string_similarity(self, str1: str, str2: str) -> float:
        """Calculates string similarity using Levenshtein distance."""
        if not str1 or not str2:
            return 0.0
        
        # Remove common words and special characters
        common_words = {'the', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by'}
        str1_words = set(str1.split())
        str2_words = set(str2.split())
        
        # Remove common words
        str1_words = str1_words - common_words
        str2_words = str2_words - common_words
        
        # Calculate similarity based on word overlap
        if not str1_words or not str2_words:
            return 0.0
        
        intersection = str1_words.intersection(str2_words)
        union = str1_words.union(str2_words)
        
        return len(intersection) / len(union) if union else 0.0

class ClassifierAgent(BaseAgent):
    """Agent 2: Modified to process a batch directly."""
    def __init__(self, llm_client, next_agent: Optional[BaseAgent] = None):
        super().__init__(llm_client, "classifier_agent")
        self.next_agent = next_agent
        self.processed_count = 0
        self.error_count = 0
        self.unclassified_count = 0
        # Placeholder for rules (same as before)
        self.rules = {
            "payment": lambda tx: tx.get('amount', 0) < 0 and 'payment' in tx.get('description','').lower(),
            "fee": lambda tx: tx.get('amount', 0) < 0 and 'fee' in tx.get('description','').lower(),
            "receipt": lambda tx: tx.get('amount', 0) > 0,
            "trade_settlement": lambda tx: tx.get('source', '').lower().startswith('tms') # Example source check
        }

    async def process(self, message: AAMessage) -> AAMessage:
        try:
            self.emit_workflow_event("start", "running", "Starting data classification")
            # Classify the data
            transactions = message.payload.cleansed_transactions
            tagged_list = self.process_batch(transactions)
            self.processed_count = len(tagged_list)
            
            # Create metrics
            metrics = {
                "processed_count": self.processed_count,
                "unclassified_count": self.unclassified_count,
                "classification_errors": self.error_count
            }
            
            self.emit_workflow_event("complete", "success", f"Data classification completed successfully. Processed {self.processed_count} records.")
            return AAMessage(
                sender_id=self.agent_name,
                receiver_id="reconciliation_agent",
                message_type="data_classified",
                payload=ClassificationResultPayload(
                    tagged_transactions=tagged_list,
                    metrics=metrics
                )
            )
        except Exception as e:
            self.emit_workflow_event("error", "failed", f"Data classification failed: {str(e)}")
            raise

    def process_batch(self, transactions: List[CleansedTransaction]) -> List[TaggedTransaction]:
        """Processes a batch of cleansed data directly."""
        logger.info(f"--- {self.agent_name} Starting Batch ({len(transactions)} records) ---")
        start_time = time.time()
        tagged_list = []
        self.processed_count = 0 # Reset counts for this batch run
        self.error_count = 0
        self.unclassified_count = 0

        for tx in transactions:
            tagged_tx = self.classify_transaction(tx)
            if tagged_tx:
                tagged_list.append(tagged_tx)
                if tagged_tx.tags.get('category') == "Unclassified":
                     self.unclassified_count += 1
            self.processed_count +=1

        end_time = time.time()
        logger.info(f"--- {self.agent_name} Finished Batch ({(end_time - start_time):.2f}s) ---")
        return tagged_list


    def classify_transaction(self, tx: CleansedTransaction) -> TaggedTransaction:
        """Applies rules/ML/LLM to classify a single transaction. (Same logic as before)"""
        logger.debug(f"[{self.agent_name}] Classifying: {tx.id}")
        tags = {}
        confidence = 1.0 # Default for rule-based
        matched_rule = False

        # --- Apply Rules (Example) ---
        for category, rule_func in self.rules.items():
            try:
                if rule_func(tx.normalized_data):
                    tags['category'] = category
                    matched_rule = True
                    logger.debug(f"[{self.agent_name}] Matched rule '{category}' for {tx.id}")
                    break
            except Exception as e:
                 logger.warning(f"[{self.agent_name}] Rule error for {tx.id}, rule '{category}': {e}")
                 self.error_count += 1

        # --- LLM for Uncategorized or Ambiguous Cases (Example) ---
        if not matched_rule:
            logger.info(f"[{self.agent_name}] No rule/ML match for {tx.id}. Trying LLM...")
            prompt = f"""Given the following transaction details, suggest a likely business category (e.g., 'Payroll', 'Software Expense', 'Client Receipt', 'Bank Fee', 'Intercompany Transfer', 'FX Gain/Loss', 'Trade Settlement', 'Unknown').
            Source: {tx.source}
            Amount: {tx.normalized_data.get('amount')} {tx.normalized_data.get('currency')}
            Date: {tx.normalized_data.get('date')}
            Description: {tx.normalized_data.get('description')}
            Respond with only the category name. If unsure, respond 'Unclassified'.
            """
            system_msg = "You are an expert financial transaction classifier."

            if self.llm_client: # Check if LLM client is available
                 llm_category = self.llm_client.generate_text(prompt, system_message=system_msg, temperature=0.2)
                 if llm_category and not llm_category.startswith("Error:") and len(llm_category) < 50:
                     tags['category'] = llm_category.strip()
                     confidence = 0.6 if tags['category'] != 'Unclassified' else 0.0
                     logger.info(f"[{self.agent_name}] Classified by LLM: '{tags['category']}' (conf: {confidence:.2f}) for {tx.id}")
                 else:
                     logger.warning(f"[{self.agent_name}] LLM classification failed or gave invalid response for {tx.id}. Marking as 'Unclassified'. Response: {llm_category}")
                     tags['category'] = "Unclassified"
                     confidence = 0.0
                     if llm_category and llm_category.startswith("Error:"): self.error_count += 1 # Count LLM errors
            else:
                 logger.warning(f"[{self.agent_name}] LLM not available for classification of {tx.id}. Marking as 'Unclassified'.")
                 tags['category'] = "Unclassified"
                 confidence = 0.0

        # Add other tags
        tags['risk'] = 'Low' # Default example
        if abs(tx.normalized_data.get('amount', 0)) > 1000: tags['risk'] = 'Medium'
        if abs(tx.normalized_data.get('amount', 0)) > 10000: tags['risk'] = 'High'

        tagged_tx = TaggedTransaction(
            cleansed_id=tx.id,
            source=tx.source,
            normalized_data=tx.normalized_data,
            tags=tags,
            confidence=confidence
        )
        return tagged_tx # Always return a TaggedTransaction, even if unclassified

    def get_metrics(self) -> Dict[str, Any]:
         return {
             "processed_count": self.processed_count,
             "unclassified_count": self.unclassified_count,
             "classification_errors": self.error_count # Renamed for clarity
         }

class ReconciliationAgent(BaseAgent):
    """Agent 3: Modified to process a batch directly."""
    def __init__(self, llm_client, routing_agent: Optional[BaseAgent] = None):
        super().__init__(llm_client, "reconciliation_agent")
        self.routing_agent = routing_agent
        self.processed_count = 0
        self.match_count = 0
        self.exception_count = 0
        self.error_count = 0
        # In-memory storage per job - This state needs careful management in a real API
        # For simplicity, we'll clear and process the batch directly here.
        self.pending_transactions: Dict[str, List[TaggedTransaction]] = {} # Reset per batch for now

    async def process(self, message: AAMessage) -> AAMessage:
        try:
            self.emit_workflow_event("start", "running", "Starting data reconciliation")
            # Reconcile the data
            transactions = message.payload.tagged_transactions
            matches, exceptions = self.process_batch_direct(transactions)
            self.processed_count = len(transactions)
            self.match_count = len(matches)
            self.exception_count = len(exceptions)
            
            # Create metrics
            metrics = {
                "processed_count": self.processed_count,
                "match_count": self.match_count,
                "exception_count": self.exception_count,
                "auto_match_rate_percent": (self.match_count / self.processed_count * 100) if self.processed_count > 0 else 0,
                "exception_rate_percent": (self.exception_count / self.processed_count * 100) if self.processed_count > 0 else 0,
                "reconciliation_errors": self.error_count
            }
            
            self.emit_workflow_event("complete", "success", f"Data reconciliation completed successfully. Processed {self.processed_count} records. Found {self.match_count} matches and {self.exception_count} exceptions.")
            return AAMessage(
                sender_id=self.agent_name,
                receiver_id="routing_agent",
                message_type="data_reconciled",
                payload=ReconciliationResultPayload(
                    matches=matches,
                    exceptions=exceptions,
                    metrics=metrics
                )
            )
        except Exception as e:
            self.emit_workflow_event("error", "failed", f"Data reconciliation failed: {str(e)}")
            raise

    def process_batch_direct(self, transactions: List[TaggedTransaction]) -> (List[MatchResult], List[ExceptionRecord]):
        """Receives tagged data directly and performs reconciliation."""
        logger.info(f"--- {self.agent_name} Starting Batch ({len(transactions)} records) ---")
        start_time = time.time()
        self.processed_count = len(transactions) # Reset count for this batch
        self.match_count = 0
        self.exception_count = 0
        self.error_count = 0
        self.pending_transactions = {} # Clear previous state (simplistic)

        # 1. Load batch into pending storage (grouped by source or reconciliation key)
        for tx in transactions:
             # Use base filename (without extension) as source key for grouping
             source_key = os.path.splitext(tx.source)[0]
             if source_key not in self.pending_transactions:
                  self.pending_transactions[source_key] = []
             self.pending_transactions[source_key].append(tx)

        # 2. Run Matching Logic (using self.pending_transactions)
        matches, exceptions = self.run_matching_logic()

        # 3. Update counts
        self.match_count = len(matches)
        # Recalculate exceptions count as run_matching_logic generates them
        self.exception_count = len(exceptions)

        # 4. Log results
        logger.info(f"[{self.agent_name}] Found {self.match_count} matches and {self.exception_count} exceptions.")

        end_time = time.time()
        logger.info(f"--- {self.agent_name} Finished Batch ({(end_time - start_time):.2f}s) ---")
        return matches, exceptions # Return results directly

    def run_matching_logic(self) -> (List[MatchResult], List[ExceptionRecord]):
        """Placeholder for core reconciliation logic (exact, fuzzy). (Same logic as before)"""
        logger.info(f"[{self.agent_name}] Running matching logic...")
        matches = []
        exceptions = []
        matched_ids = set()

        source_keys = list(self.pending_transactions.keys())
        if len(source_keys) < 2:
            logger.warning(f"[{self.agent_name}] Need at least two sources for matching. Found: {source_keys}")
            for source_list in self.pending_transactions.values():
                for tx in source_list:
                     exceptions.append(ExceptionRecord(
                         exception_id=f"ex_unmatched_single_{tx.id}",
                         related_transaction_ids=[tx.id],
                         exception_type="Unmatched Transaction (Single Source)",
                         severity="Medium", details={"data": tx.normalized_data, "message": "Only one source file provided."}
                     ))
            return matches, exceptions

        # Simple pairwise matching between the first two sources found
        list1_key = source_keys[0]
        list2_key = source_keys[1]
        list1 = self.pending_transactions[list1_key]
        list2 = self.pending_transactions[list2_key]
        logger.info(f"Comparing {len(list1)} records from '{list1_key}' vs {len(list2)} records from '{list2_key}'.")

        try:
            # (Exact Match Logic - Copied and refined)
            for tx1 in list1:
                if tx1.id in matched_ids: continue
                potential_matches = []
                for tx2 in list2:
                    if tx2.id in matched_ids: continue
                    # Refined match criteria (allow small tolerance, check opposite signs)
                    amount1 = tx1.normalized_data.get('amount', 0)
                    amount2 = tx2.normalized_data.get('amount', 0)
                    is_match = (
                        tx1.normalized_data.get('date') == tx2.normalized_data.get('date') and
                        tx1.normalized_data.get('currency') == tx2.normalized_data.get('currency') and
                        abs(amount1 + amount2) < 0.01 # Check if amounts sum to near zero (opposite signs)
                    )
                    if is_match:
                        potential_matches.append(tx2)

                if len(potential_matches) == 1:
                    tx2_match = potential_matches[0]
                    match = MatchResult(
                        match_id=f"match_{tx1.id}_{tx2_match.id}",
                        matched_transaction_ids=[tx1.id, tx2_match.id],
                        match_type="Exact Amount/Date/Ccy (Opposite Sign)",
                        confidence=1.0
                    )
                    matches.append(match)
                    matched_ids.add(tx1.id)
                    matched_ids.add(tx2_match.id)
                elif len(potential_matches) > 1:
                     exceptions.append(ExceptionRecord(
                         exception_id=f"ex_multi_{tx1.id}",
                         related_transaction_ids=[tx1.id] + [p.id for p in potential_matches],
                         exception_type="Potential Multiple Matches", severity="Medium",
                         details={"source1_data": tx1.normalized_data, "source2_matches_data": [p.normalized_data for p in potential_matches]}
                     ))
                     # Don't mark as matched_ids - needs review

            # (LLM Fuzzy Suggestion Logic - Copied from previous version, needs self.llm check)
            unmatched1 = [tx for tx in list1 if tx.id not in matched_ids]
            unmatched2 = [tx for tx in list2 if tx.id not in matched_ids]
            if self.llm_client and unmatched1 and unmatched2:
                 logger.info(f"[{self.agent_name}] Attempting LLM fuzzy match suggestions for {len(unmatched1)} vs {len(unmatched2)} records.")
                 for tx1 in unmatched1[:5]: # Limit LLM use for performance
                     if tx1.id in matched_ids: continue # Skip if already matched by another LLM suggestion perhaps
                     # Simplified prompt construction
                     candidates_str = "\n".join([f"- ID: {b.id}, Amt: {b.normalized_data.get('amount')}, Date: {b.normalized_data.get('date')}, Desc: {b.normalized_data.get('description', '')[:50]}"
                                                for b in unmatched2 if b.id not in matched_ids][:10]) # Show only available candidates
                     if not candidates_str: continue # No candidates left to match against

                     prompt = f"You are a financial reconciliation assistant. An transaction from '{list1_key}' needs matching to a transaction from '{list2_key}'.\nSource 1 TX: ID: {tx1.id}, Amt: {tx1.normalized_data.get('amount')}, Date: {tx1.normalized_data.get('date')}, Desc: {tx1.normalized_data.get('description', '')}\n\nPotential Source 2 Matches:\n{candidates_str}\n\nAnalyze descriptions, amounts (allow small differences, signs likely opposite), and dates (allow +/- 1-2 days difference). Identify the BEST matching Source 2 ID from the list ONLY IF confident. If confident, respond ONLY with the Source 2 ID (e.g., '{list2[0].id if list2 else 'tx_id'}'). If not confident, respond ONLY with 'NONE'."
                     llm_suggestion = self.llm_client.generate_text(prompt, temperature=0.1)

                     if llm_suggestion and llm_suggestion.strip() != 'NONE' and not llm_suggestion.startswith("Error:"):
                         suggested_tx2_id = llm_suggestion.strip()
                         suggested_tx2 = next((tx for tx in unmatched2 if tx.id == suggested_tx2_id), None)
                         # Ensure suggested match isn't already matched or the source tx itself
                         if suggested_tx2 and suggested_tx2_id not in matched_ids and tx1.id not in matched_ids:
                             exceptions.append(ExceptionRecord(
                                 exception_id=f"ex_llm_sugg_{tx1.id}", related_transaction_ids=[tx1.id, suggested_tx2_id],
                                 exception_type="LLM Suggested Match", severity="Low",
                                 details={"tx1_data": tx1.normalized_data, "tx2_data": suggested_tx2.normalized_data},
                                 suggested_action="Review suggested match."
                             ))
                             matched_ids.add(tx1.id) # Mark as handled by exception
                             matched_ids.add(suggested_tx2_id)
                         elif suggested_tx2_id in matched_ids:
                              logger.debug(f"[{self.agent_name}] LLM suggested already handled ID '{suggested_tx2_id}' for {tx1.id}.")
                         else:
                              logger.warning(f"[{self.agent_name}] LLM suggested invalid ID '{suggested_tx2_id}' for {tx1.id}.")

                     elif llm_suggestion and llm_suggestion.startswith("Error:"):
                         self.error_count += 1
                         logger.error(f"[{self.agent_name}] LLM error during suggestion for {tx1.id}: {llm_suggestion}")

            # (Generate Exceptions for remaining Unmatched - Copied from previous version)
            final_unmatched = [tx for source_list in self.pending_transactions.values() for tx in source_list if tx.id not in matched_ids]
            for tx in final_unmatched:
                 exceptions.append(ExceptionRecord(
                     exception_id=f"ex_unmatched_{tx.id}", related_transaction_ids=[tx.id],
                     exception_type="Unmatched Transaction", severity="Medium",
                     details={"source": tx.source, "data": tx.normalized_data, "tags": tx.tags}
                 ))
            logger.info(f"[{self.agent_name}] Generated {len(final_unmatched)} final unmatched exceptions.")

        except Exception as e:
            logger.exception(f"[{self.agent_name}] Error during matching logic: {e}")
            self.error_count += 1
            # Add a general exception?
            exceptions.append(ExceptionRecord(
                exception_id=f"ex_match_error_{random.randint(1000,9999)}",
                related_transaction_ids=[],
                exception_type="Matching Engine Error", severity="Critical",
                details={"error": str(e)}, suggested_action="Investigate matching engine failure."
            ))

        return matches, exceptions

    def get_metrics(self) -> Dict[str, Any]:
         # Calculate metrics based on the single batch processed
         total_processed = self.processed_count
         if total_processed == 0: # Avoid division by zero if no records came in
              return {
                  "processed_count": 0, "match_count": 0, "exception_count": 0,
                  "auto_match_rate_percent": 0, "exception_rate_percent": 0, "reconciliation_errors": self.error_count
              }

         # Filter out LLM suggestions from 'real' exceptions for rates if needed
         # real_exceptions = [ex for ex in exceptions if ex.exception_type != "LLM Suggested Match"]
         # For now, include all exceptions in rate
         auto_match_rate = (self.match_count / total_processed) * 100
         exception_rate = (self.exception_count / total_processed) * 100
         return {
             "processed_count": total_processed,
             "match_count": self.match_count,
             "exception_count": self.exception_count,
             "auto_match_rate_percent": round(auto_match_rate, 2),
             "exception_rate_percent": round(exception_rate, 2),
             "reconciliation_errors": self.error_count
         }

class RoutingAgent(BaseAgent):
    """Agent 4: Modified to process exceptions directly."""
    def __init__(self, llm_client):
        super().__init__(llm_client, "routing_agent")
        self.processed_count = 0
        self.ticket_count = 0
        self.routing_errors = 0
        # Routing rules (same as before)
        self.routing_rules = {
            "Unmatched Transaction": {"system": "JIRA", "assignee": "ReconTeamLead", "priority": "Medium"},
            "Potential Multiple Matches": {"system": "JIRA", "assignee": "ReconTeamSenior", "priority": "High"},
            "LLM Suggested Match": {"system": "ServiceNow", "assignee": "ReconTeamJunior", "priority": "Low"},
            "Data Discrepancy": {"system": "ServiceNow", "assignee": "DataQualityTeam", "priority": "Medium"},
            "Unmatched Transaction (Single Source)": {"system": "ManualReview", "assignee": "OpsManager", "priority": "Low"},
            "Matching Engine Error": {"system": "ITSupport", "assignee": "AppSupport", "priority": "Critical"},
        }
        self.default_route = {"system": "ManualReview", "assignee": "OpsManager", "priority": "Medium"}


    async def process(self, message: AAMessage) -> AAMessage:
        try:
            self.emit_workflow_event("start", "running", "Starting data routing")
            # Route the data
            exceptions = message.payload.exceptions
            tickets_created = self.process_exceptions_direct(exceptions)
            self.processed_count = len(exceptions)
            self.ticket_count = len(tickets_created)
            self.emit_workflow_event("complete", "success", f"Data routing completed successfully. Created {self.ticket_count} tickets.")
            return AAMessage(
                sender_id=self.agent_name,
                receiver_id="supervisor_agent",
                message_type="data_routed",
                payload=RoutingResultPayload(
                    tickets_created=tickets_created,
                    metrics={
                        "processed_count": self.processed_count,
                        "ticket_count": self.ticket_count,
                        "routing_errors": self.routing_errors
                    }
                )
            )
        except Exception as e:
            self.emit_workflow_event("error", "failed", f"Data routing failed: {str(e)}")
            raise

    def process_exceptions_direct(self, exceptions: List[ExceptionRecord]) -> List[Ticket]:
        """Receives exceptions directly and routes them."""
        logger.info(f"--- {self.agent_name} Starting Batch ({len(exceptions)} exceptions) ---")
        start_time = time.time()
        tickets_created = []
        self.processed_count = len(exceptions) # Reset counts for this batch
        self.ticket_count = 0
        self.routing_errors = 0

        for ex in exceptions:
            ticket = self.route_exception(ex)
            if ticket:
                tickets_created.append(ticket)
                self.ticket_count += 1
            # Error count incremented within route_exception

        logger.info(f"[{self.agent_name}] Created {len(tickets_created)} tickets.")
        end_time = time.time()
        logger.info(f"--- {self.agent_name} Finished Batch ({(end_time - start_time):.2f}s) ---")
        return tickets_created

    def route_exception(self, exception: ExceptionRecord) -> Optional[Ticket]:
        """Determines routing and creates a ticket. (Same logic as before, needs self.llm check)"""
        logger.debug(f"[{self.agent_name}] Routing exception: {exception.exception_id} ({exception.exception_type})")
        route_info = self.routing_rules.get(exception.exception_type)
        ticket_summary = ""
        llm_used = False

        if not route_info and self.llm_client: # Use LLM if rule not found AND LLM is available
             logger.warning(f"[{self.agent_name}] No rule for '{exception.exception_type}'. Using LLM.")
             llm_used = True
             prompt = f"Analyze the financial reconciliation exception below. Suggest the best route (format: 'Team Name in System Name', e.g., 'Recon Ops in JIRA' or 'Data Quality in ServiceNow' or 'Trading Support via Email') and write a concise one-sentence summary for a ticket.\n\nException Type: {exception.exception_type}\nSeverity: {exception.severity}\nDetails: {str(exception.details)[:200]}...\nSuggested Action: {exception.suggested_action or 'N/A'}\n\nRespond ONLY in this format:\nRoute: [Suggested Route]\nSummary: [One-sentence summary]"
             llm_response = self.llm_client.generate_text(prompt, temperature=0.3)
             # Basic parsing
             try:
                 route_str = ""
                 summary_str = f"Needs review: {exception.exception_type}" # Default if parsing fails
                 for line in llm_response.split('\n'):
                     line_lower = line.lower()
                     if line_lower.startswith("route:"): route_str = line.split(":", 1)[1].strip()
                     elif line_lower.startswith("summary:"): summary_str = line.split(":", 1)[1].strip()

                 if route_str:
                     # Basic parsing of "Team Name in System Name" format
                     parts = route_str.split(" in ")
                     assignee = parts[0].strip() if parts else "Unknown Team"
                     system = parts[1].strip() if len(parts) > 1 else "DefaultQueue" # Handle cases where system isn't specified
                     route_info = {"system": system, "assignee": assignee, "priority": exception.severity} # Use original severity
                     ticket_summary = summary_str
                     logger.info(f"[{self.agent_name}] LLM suggested route: {route_info} for {exception.exception_id}")
                 else:
                     logger.error(f"[{self.agent_name}] LLM failed to provide route format for {exception.exception_id}. Using default. Response: {llm_response}")
                     route_info = self.default_route
                     ticket_summary = f"Unclassified exception requires review: {exception.exception_type}"
                     self.routing_errors +=1 # Count failure to parse LLM response as error

             except Exception as e:
                  logger.error(f"[{self.agent_name}] Error parsing LLM routing response for {exception.exception_id}: {e}. Using default.")
                  route_info = self.default_route
                  ticket_summary = f"Error during LLM routing: {exception.exception_type}"
                  self.routing_errors +=1
        elif not route_info: # No rule and no LLM
             logger.error(f"[{self.agent_name}] No rule for '{exception.exception_type}' and LLM unavailable. Using default.")
             route_info = self.default_route
             ticket_summary = f"Unclassified exception requiring review: {exception.exception_type}"
        else: # Rule found
             ticket_summary = f"{exception.exception_type} - Severity: {exception.severity}. Action: {exception.suggested_action or 'Investigate'}"


        # --- Create Ticket (Placeholder - needs actual API calls) ---
        if route_info:
            try:
                target_system = route_info.get("system", "Unknown")
                assignee = route_info.get("assignee")
                # Simulate API call to ticketing system (e.g., JIRA, ServiceNow)
                # Replace this with actual HTTP requests using libraries like 'requests' or 'httpx'
                external_ticket_id = f"{target_system.upper()}-{random.randint(1000, 9999)}"
                logger.info(f"[{self.agent_name}] SIMULATE: Create ticket in {target_system} for {exception.exception_id}. Assignee: {assignee}. Summary: {ticket_summary}")
                # Example using httpx (needs async def route_exception if used):
                # async with httpx.AsyncClient() as client:
                #    payload = {"summary": ticket_summary, "description": str(exception.details), ...}
                #    response = await client.post("TICKETING_SYSTEM_API_ENDPOINT", json=payload)
                #    response.raise_for_status()
                #    external_ticket_id = response.json().get("id")

                # time.sleep(0.1) # Simulate API delay

                ticket = Ticket(
                    ticket_id=external_ticket_id, system=target_system, exception_id=exception.exception_id,
                    summary=ticket_summary, assignee=assignee, status="Open"
                )
                return ticket
            except Exception as e:
                logger.exception(f"[{self.agent_name}] Failed to create ticket for {exception.exception_id}: {e}")
                self.routing_errors += 1
                return None
        else:
             # This case should be handled by the default route logic above
             logger.error(f"[{self.agent_name}] No routing information determined for exception {exception.exception_id}.")
             self.routing_errors += 1
             return None

    def get_metrics(self) -> Dict[str, Any]:
         return {
             "exceptions_processed": self.processed_count,
             "tickets_created": self.ticket_count,
             "routing_errors": self.routing_errors,
         }


class SupervisorAgent(BaseAgent):
    """Agent 5: Modified to generate summary from final results."""
    def __init__(self, llm_client, monitored_agents: List[BaseAgent]):
        super().__init__(llm_client, "supervisor_agent")
        self.monitored_agents = monitored_agents

    async def process(self, message: AAMessage) -> AAMessage:
        try:
            self.emit_workflow_event("start", "running", "Starting workflow supervision")
            # Supervise the workflow
            job_results = message.payload.tickets_created
            summary = self.generate_final_summary(job_results)
            self.emit_workflow_event("complete", "success", "Workflow supervision completed successfully")
            return AAMessage(
                sender_id=self.agent_name,
                receiver_id="api_orchestrator",
                message_type="workflow_completed",
                payload=SummaryResultPayload(
                    final_summary=summary
                )
            )
        except Exception as e:
            self.emit_workflow_event("error", "failed", f"Workflow supervision failed: {str(e)}")
            raise

    def generate_final_summary(self, job_results: Dict) -> str:
        """Generates a summary based on the completed job results, potentially using LLM."""
        logger.info(f"--- [{self.agent_name}] Generating Final Summary ---")
        summary = "Workflow completed. "
        try:
            # Extract key metrics from results
            ext_metrics = job_results.get("extraction_metrics", {})
            cls_metrics = job_results.get("classification_metrics", {})
            rec_metrics = job_results.get("reconciliation_metrics", {})
            rou_metrics = job_results.get("routing_metrics", {})

            ingested = ext_metrics.get("records_ingested", "N/A")
            validated = ext_metrics.get("records_validated_after_dedupe", "N/A")
            duplicates = ext_metrics.get("duplicates_removed", "N/A")
            unclassified = cls_metrics.get("unclassified_count", "N/A")
            matched = rec_metrics.get("match_count", "N/A")
            match_rate = rec_metrics.get("auto_match_rate_percent", "N/A")
            exceptions = rec_metrics.get("exception_count", "N/A")
            tickets = rou_metrics.get("tickets_created", "N/A")

            # Build a basic summary string
            summary += f"Ingested: {ingested}, Validated: {validated} (Duplicates: {duplicates}). "
            summary += f"Matches: {matched} ({match_rate}%), Exceptions: {exceptions} (Unclassified: {unclassified}). Tickets: {tickets}."

            # --- LLM for Enhanced Summary (Example - needs self.llm check) ---
            if self.llm_client:
                prompt = f"""Based on these reconciliation results, provide a concise (1-2 sentence) human-readable executive summary highlighting the outcome and any potential issues.
                Total Records Ingested: {ingested}
                Records Validated (after dedupe): {validated}
                Duplicates Removed: {duplicates}
                Validation Errors: {ext_metrics.get("validation_errors", "N/A")}
                Matches Found: {matched} ({match_rate}%)
                Total Exceptions: {exceptions}
                Unclassified Transactions: {unclassified}
                Tickets Created: {tickets}
                Routing Errors: {rou_metrics.get("routing_errors", "N/A")}
                """
                if job_results.get("error"): prompt += f"\nCRITICAL ERROR during processing: {job_results['error']}"

                system_msg = "Summarize reconciliation job results concisely for a business overview."
                llm_summary = self.llm_client.generate_text(prompt, system_message=system_msg, temperature=0.4)

                if llm_summary and not llm_summary.startswith("Error:"):
                     summary = llm_summary # Use LLM summary if successful
                     logger.info(f"[{self.agent_name}] Generated LLM summary: {summary}")
                else:
                     logger.warning(f"[{self.agent_name}] LLM failed to generate summary, using basic one. LLM Response: {llm_summary}")
            else:
                 logger.warning(f"[{self.agent_name}] LLM not available for summary generation.")

        except Exception as e:
             logger.exception(f"[{self.agent_name}] Error generating summary: {e}")
             summary = "Workflow completed, but summary generation failed."

        return summary

    def get_metrics(self) -> Dict[str, Any]:
         # In a real API, this endpoint would fetch metrics from a persistent store or poll agents
         # Returning dummy metrics for now
         return {"api_requests": 0, "active_jobs": 0} # Needs access to job store

def identify_field_types(self, headers: List[str], sample_data: Dict[str, List[str]]) -> Dict[str, str]:
    """Identify field types based on header names and sample data."""
    field_types = {}
    
    # Common patterns for different field types
    id_patterns = [
        r'id$', r'identifier$', r'number$', r'no$', r'num$', r'code$',
        r'transaction', r'record', r'ref$', r'reference$'
    ]
    currency_patterns = [
        r'currency$', r'curr$', r'ccy$', r'type$', r'status$'
    ]
    amount_patterns = [
        r'amount$', r'value$', r'price$', r'cost$', r'total$'
    ]
    date_patterns = [
        r'date$', r'time$', r'when$', r'created$', r'updated$'
    ]
    
    for header in headers:
        header_lower = header.lower()
        samples = sample_data.get(header, [])
        
        # Check for ID fields
        if any(re.search(pattern, header_lower) for pattern in id_patterns):
            field_types[header] = 'id'
            continue
            
        # Check for currency fields
        if any(re.search(pattern, header_lower) for pattern in currency_patterns):
            field_types[header] = 'currency'
            continue
            
        # Check for amount fields
        if any(re.search(pattern, header_lower) for pattern in amount_patterns):
            field_types[header] = 'amount'
            continue
            
        # Check for date fields
        if any(re.search(pattern, header_lower) for pattern in date_patterns):
            field_types[header] = 'date'
            continue
            
        # Analyze sample data for unknown fields
        if samples:
            # Check if all samples are numeric
            if all(self._is_numeric(s) for s in samples):
                field_types[header] = 'numeric'
            # Check if all samples are dates
            elif all(self._is_date(s) for s in samples):
                field_types[header] = 'date'
            # Check if samples are short text (potential currency codes)
            elif all(len(str(s)) <= 5 for s in samples):
                field_types[header] = 'short_text'
            else:
                field_types[header] = 'text'
        else:
            field_types[header] = 'unknown'
    
    return field_types

def _is_numeric(self, value: str) -> bool:
    """Check if a value is numeric."""
    try:
        float(str(value).replace(',', ''))
        return True
    except (ValueError, TypeError):
        return False

def _is_date(self, value: str) -> bool:
    """Check if a value is a date."""
    try:
        pd.to_datetime(value)
        return True
    except (ValueError, TypeError):
        return False

def validate_and_standardize(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Validate and standardize the data."""
    validation_errors = []
    
    # Get field types
    field_types = self.identify_field_types(data.columns.tolist(), {
        col: data[col].head(5).astype(str).tolist() 
        for col in data.columns
    })
    
    # Find potential ID and currency fields
    potential_id_fields = [
        h for h, t in field_types.items() 
        if t in ['id', 'numeric', 'short_text']
    ]
    potential_currency_fields = [
        h for h, t in field_types.items() 
        if t in ['currency', 'short_text', 'text']
    ]
    
    # Log identified fields
    logger.info(f"Identified field types: {field_types}")
    logger.info(f"Potential ID fields: {potential_id_fields}")
    logger.info(f"Potential currency fields: {potential_currency_fields}")
    
    # Use the first potential field if no exact match found
    if potential_id_fields:
        self.id_field = potential_id_fields[0]
        logger.info(f"Using {self.id_field} as ID field")
    else:
        validation_errors.append("No suitable ID field found")
        
    if potential_currency_fields:
        self.currency_field = potential_currency_fields[0]
        logger.info(f"Using {self.currency_field} as currency field")
    else:
        validation_errors.append("No suitable currency field found")
    
    # Standardize data
    if self.id_field:
        data[self.id_field] = data[self.id_field].astype(str)
    if self.currency_field:
        data[self.currency_field] = data[self.currency_field].astype(str).str.upper()
    
    return data, validation_errors