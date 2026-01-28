const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const config = require('./config');
const datasetLoader = require('./dataset-loader');
const aiPipeline = require('./ai-pipeline');

/**
 * Voice AI Friend - Main Server
 * Handles HTTP requests and WebSocket connections for real-time voice chat
 */

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (frontend)
app.use(express.static(__dirname));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        dataset: datasetLoader.getStats(),
        pipeline: aiPipeline.getStats(),
    });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔌 New client connected');

    let sessionData = {
        voiceGender: 'female',
        messageCount: 0,
    };

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            // Handle different message types
            switch (data.type) {
                case 'voice_config':
                    // Update voice preference
                    sessionData.voiceGender = data.gender || 'female';
                    ws.send(JSON.stringify({
                        type: 'config_updated',
                        gender: sessionData.voiceGender,
                    }));
                    console.log(`🎤 Voice changed to: ${sessionData.voiceGender}`);
                    break;

                case 'user_message':
                    // Process user input and generate response
                    sessionData.messageCount++;
                    const userInput = data.text;

                    console.log(`💬 User: "${userInput}"`);

                    // Generate AI response
                    const result = await aiPipeline.generateResponse(
                        userInput,
                        sessionData.voiceGender
                    );

                    console.log(`🤖 AI (${result.source}, ${result.latency}ms): "${result.response}"`);

                    // Send response back to client
                    ws.send(JSON.stringify({
                        type: 'ai_response',
                        text: result.response,
                        source: result.source,
                        latency: result.latency,
                        voiceGender: sessionData.voiceGender,
                    }));
                    break;

                case 'ping':
                    // Keep-alive ping
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                default:
                    console.warn('⚠️  Unknown message type:', data.type);
            }

        } catch (error) {
            console.error('❌ Error processing message:', error.message);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Sorry, I had trouble processing that. Can you try again?',
            }));
        }
    });

    ws.on('close', () => {
        console.log(`👋 Client disconnected (${sessionData.messageCount} messages)`);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Voice AI Friend',
    }));
});

// Initialize and start server
async function startServer() {
    try {
        console.log('🚀 Starting Voice AI Friend server...\n');

        // Load dataset
        await datasetLoader.load();

        // Start HTTP server
        server.listen(config.port, () => {
            console.log(`\n✅ Server running on http://localhost:${config.port}`);
            console.log(`📊 WebSocket ready for connections`);
            console.log(`\n💡 Open http://localhost:${config.port} in your browser\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');

    // Close all WebSocket connections
    wss.clients.forEach((client) => {
        client.close();
    });

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
