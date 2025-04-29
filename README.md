# ReconcileAI Orchestrator

A modern reconciliation tool powered by AI for automated transaction matching and exception handling. This project uses a robust agent-to-agent protocol to manage the entire reconciliation workflow.

## Features

- **File Upload**: Support for Excel, CSV, and other delimited formats
- **Intelligent Header Detection**: Automatically identifies key fields across different file formats
- **AI-Powered Matching**: Uses AI to match transactions across different systems
- **Exception Handling**: Automated routing and resolution suggestions for exceptions
- **Interactive Dashboard**: Real-time monitoring of reconciliation progress

## Project Structure

The project consists of two main components:

### Backend (Python/FastAPI)

- Agent-to-agent protocol implementation
- File processing and header extraction
- Reconciliation logic
- WebSocket for real-time updates

### Frontend (React/TypeScript)

- Modern UI built with React and TypeScript
- Real-time data visualization
- File upload and configuration interface
- Exception review and management

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama for LLM capabilities

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/gudakeshin/reconcile-ai-orchestrator.git
   cd reconcile-ai-orchestrator
   ```

2. Set up the backend:
   ```
   cd backend
   pip install -r requirements.txt
   python api.py
   ```

3. Set up the frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```

4. Access the application at http://localhost:5173

## Usage

1. Upload source and target files (Excel, CSV, etc.)
2. Configure matching fields and tolerance settings
3. Start the reconciliation process
4. Review results and handle exceptions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FastAPI for the backend API framework
- React/Vite for the frontend framework
- Shadcn UI for the component system 