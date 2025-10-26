# AI-Coder Model Configuration

This directory contains configuration and placeholder files for AI model integration.

## Supported Models

### Ollama Integration
- **Code Generation**: For generating code snippets and completions
- **Code Analysis**: For analyzing code quality and suggesting improvements
- **Chat Assistant**: For conversational AI assistance

## Model Files

### `ollama-config.json`
Configuration file for Ollama model settings and parameters.

### `model-placeholder.txt`
Placeholder file indicating where model files would be stored.

## Usage

1. Install Ollama: https://ollama.ai/
2. Pull required models:
   ```bash
   ollama pull codellama
   ollama pull llama2
   ollama pull mistral
   ```
3. Configure models in `ollama-config.json`
4. Start the backend server to use AI features

## Model Requirements

- **Minimum RAM**: 8GB (for smaller models)
- **Recommended RAM**: 16GB+ (for larger models)
- **Storage**: 10GB+ for model files
- **GPU**: Optional but recommended for better performance

## Security Notes

- Models run locally for privacy
- No data is sent to external services
- All AI processing happens on your machine

