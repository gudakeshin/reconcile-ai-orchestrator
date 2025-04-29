import ollama
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
# Make sure 'gemma:2b' is pulled in your local Ollama instance
# Or change this to 'gemma3:4b' if that's the specific model you have available
MODEL_NAME = "gemma3:4b"
OLLAMA_HOST = None # Set to "http://your_ollama_host:port" if not default localhost:11434
# --- End Configuration ---

class LLMClient:
    """
    A client to interact with the local Ollama LLM.
    """
    def __init__(self, model=MODEL_NAME, host=OLLAMA_HOST):
        self.model = model
        self.client = ollama.Client(host=host)
        try:
            # Check connection and model availability on initialization
            self.client.list()
            logger.info(f"Successfully connected to Ollama host: {host or 'default'}")
            # You might want to add a check here to ensure self.model exists in the list
        except Exception as e:
            logger.error(f"Failed to connect to Ollama host: {host or 'default'}. Error: {e}")
            logger.error("Please ensure Ollama is running and the host/port are correct.")
            # Raise specific error to be caught during API startup potentially
            raise ConnectionError(f"Could not connect to Ollama service at {host or 'default'}") from e

    def generate_text(self, prompt: str, system_message: str = None, **kwargs) -> str:
        """
        Calls the Ollama LLM to generate text based on a prompt.

        Args:
            prompt (str): The main user prompt.
            system_message (str, optional): An optional system message to guide the model.
            **kwargs: Additional parameters for the ollama generate API
                      (e.g., temperature, top_k, top_p).

        Returns:
            str: The generated text response from the LLM.
        """
        messages = []
        if system_message:
            messages.append({'role': 'system', 'content': system_message})
        messages.append({'role': 'user', 'content': prompt})

        try:
            logger.debug(f"Sending request to LLM (model: {self.model}): {messages}")
            response = self.client.chat(
                model=self.model,
                messages=messages,
                stream=False, # Get full response at once
                options=kwargs # Pass parameters like temperature etc.
            )
            logger.debug(f"Received response from LLM: {response}")
            if response and 'message' in response and 'content' in response['message']:
                return response['message']['content'].strip()
            else:
                logger.error(f"Unexpected LLM response format: {response}")
                return "Error: Received unexpected format from LLM."
        except Exception as e:
            logger.error(f"Error during LLM call to model {self.model}: {e}")
            # Consider more specific error handling based on ollama exceptions
            return f"Error: Could not get response from LLM. {e}"

# Example usage (optional, for testing)
if __name__ == "__main__":
    try:
        llm = LLMClient()
        test_prompt = "Explain the concept of agentic AI in one sentence."
        response = llm.generate_text(test_prompt, system_message="You are a helpful AI assistant.")
        print(f"Test Prompt: {test_prompt}")
        print(f"LLM Response: {response}")
    except ConnectionError as e:
        print(f"Failed to initialize LLMClient: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")