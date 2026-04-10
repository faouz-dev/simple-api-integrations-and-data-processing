# Simple API Integrations and Data Processing

A simple backend project using Node.js and Express to process name classification data.

## Description

This API provides an endpoint to classify names based on gender, probability, and other parameters. It uses middleware to verify an API key.

## Installation

1. Make sure you have Node.js installed.
2. Clone or download this project.
3. Install dependencies:
   ```
   npm install
   ```

## Usage

Start the server:

```
npm start
```

The server will start on port 3000 (or the PORT environment variable).

## API Endpoints

### GET /api/classify

Classifies a name based on the provided parameters.

**Query Parameters:**

- `name` (string, required): The name to classify.
- `gender` (string, optional): The predicted gender.
- `probability` (number, optional): The prediction probability.
- `count` (number, optional): The sample size.
- `apikey` (string, required): API key for authentication (use "test-api-key").

**Responses:**

- 200: Success, returns classification data.
- 400: Bad request (missing parameters).
- 402: Unprocessable entity (invalid name).
- 403: API key missing or invalid.
- 500: Internal error.

**Example successful response:**

```json
{
  "status": "success",
  "data": {
    "name": "Andre",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2023-10-01T12:00:00.000Z"
  }
}
```

## Request Examples

See the `request.http` file for HTTP request examples.

## Middleware

- `apiKeyHandler`: Checks for the presence and validity of the API key in query parameters.

## Technologies Used

- Node.js
- Express
- CORS
