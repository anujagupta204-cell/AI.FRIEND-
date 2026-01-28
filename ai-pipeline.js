const OpenAI = require('openai');
const config = require('./config');
const datasetLoader = require('./dataset-loader');

/**
 * AI Pipeline - Core response generation with ultra-low latency
 * Strategy: Cache-first, then lightweight LLM fallback
 */
class AIPipeline {
    constructor() {
        this.openai = null;
        this.responseCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;

        // Initialize OpenAI only if API key is provided
        if (config.openai.apiKey) {
            this.openai = new OpenAI({
                apiKey: config.openai.apiKey,
            });
            console.log('🤖 OpenAI initialized for fallback responses');
        } else {
            console.log('⚠️  OpenAI API key not provided - using cache-only mode');
        }
    }

    /**
     * Generate AI response with latency optimization
     */
    async generateResponse(userInput, voiceGender = 'female') {
        const startTime = Date.now();

        try {
            // Step 1: Check dataset cache (ultra-fast, ~1ms)
            const cachedResponse = datasetLoader.findResponse(userInput);

            if (cachedResponse) {
                this.cacheHits++;
                const latency = Date.now() - startTime;
                console.log(`✅ Cache hit (${latency}ms): "${userInput.substring(0, 30)}..."`);

                return {
                    response: this._cleanResponse(cachedResponse),
                    source: config.dataset.sourceUrl || 'cache',
                    latency,
                };
            }

            // Step 2: LLM fallback for novel inputs
            this.cacheMisses++;
            console.log(`🔄 Cache miss, using LLM: "${userInput.substring(0, 30)}..."`);

            const llmResponse = await this._generateLLMResponse(userInput, voiceGender);
            const latency = Date.now() - startTime;

            return {
                response: llmResponse,
                source: 'llm',
                latency,
            };

        } catch (error) {
            console.error('❌ Error generating response:', error.message);

            // Fallback to generic supportive response
            return {
                response: "I'm here for you. Tell me more about what's on your mind.",
                source: 'fallback',
                latency: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate response using LLM with personality prompting
     */
    async _generateLLMResponse(userInput, voiceGender) {
        if (!this.openai) {
            // No API key - use generic empathetic response
            return this._generateGenericResponse(userInput);
        }

        try {
            // Get example conversations for personality reference
            const example1 = datasetLoader.getRandomExample();
            const example2 = datasetLoader.getRandomExample();

            const systemPrompt = `You are a caring, empathetic AI friend. Your responses should be:
- Short (1-2 sentences maximum)
- Warm and supportive
- Conversational and natural (for voice)
- Never mention you're an AI, training, or datasets
- Focus on emotional support and validation

Examples of your personality:
User: ${example1?.user || 'I feel lonely'}
You: ${example1?.ai || "I'm here for you"}

User: ${example2?.user || 'I am stressed'}
You: ${example2?.ai || "That's okay. Want to talk about it?"}

Respond naturally as a supportive friend would in conversation.`;

            const completion = await this.openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInput },
                ],
                max_tokens: config.openai.maxTokens,
                temperature: config.openai.temperature,
            });

            const response = completion.choices[0].message.content.trim();
            return this._cleanResponse(response);

        } catch (error) {
            console.error('❌ OpenAI API error:', error.message);
            return this._generateGenericResponse(userInput);
        }
    }

    /**
     * Generate generic empathetic response when LLM unavailable
     */
    _generateGenericResponse(userInput) {
        const input = userInput.toLowerCase();

        // Simple keyword-based responses
        if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
            return "Hey! I'm here for you. How are you feeling?";
        }
        if (input.includes('thank')) {
            return "You're welcome! I'm always here when you need me.";
        }
        if (input.includes('bye') || input.includes('goodbye')) {
            return "Take care! I'll be here whenever you need to talk.";
        }

        // Default empathetic response
        return "I hear you. Tell me more about what's on your mind.";
    }

    /**
     * Clean response for voice output
     * Remove emojis, markdown, and other non-speech elements
     */
    _cleanResponse(text) {
        return text
            .replace(/[😊😄🤍💪❤️🌟✨💫]/g, '') // Remove emojis
            .replace(/\*\*/g, '') // Remove markdown bold
            .replace(/\*/g, '') // Remove markdown italic
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Get pipeline statistics
     */
    getStats() {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: `${hitRate}%`,
            llmEnabled: !!this.openai,
        };
    }
}

// Singleton instance
const aiPipeline = new AIPipeline();

module.exports = aiPipeline;
