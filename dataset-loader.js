const fs = require('fs');
const config = require('./config');

/**
 * Dataset Loader - Optimized for ultra-fast response lookup
 * Loads and indexes the conversation dataset for O(1) retrieval
 */
class DatasetLoader {
    constructor() {
        this.conversations = [];
        this.keywordIndex = new Map();
        this.loaded = false;
    }

    /**
     * Load and parse the dataset file
     */
    async load() {
        console.log('📚 Loading dataset...');
        const startTime = Date.now();

        try {
            const data = fs.readFileSync(config.dataset.path, config.dataset.encoding);
            const lines = data.split('\n');

            let currentUser = null;
            let conversationCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith('User:')) {
                    currentUser = line.substring(5).trim();
                } else if (line.startsWith('AI:') && currentUser) {
                    const aiResponse = line.substring(3).trim();

                    // Store conversation pair
                    this.conversations.push({
                        user: currentUser,
                        ai: aiResponse,
                    });

                    // Index by keywords for fast lookup
                    this._indexConversation(currentUser, aiResponse);

                    conversationCount++;
                    currentUser = null;
                }
            }

            this.loaded = true;
            const loadTime = Date.now() - startTime;
            console.log(`✅ Dataset loaded: ${conversationCount} conversations in ${loadTime}ms`);
            console.log(`📊 Keyword index size: ${this.keywordIndex.size} unique patterns`);

        } catch (error) {
            console.error('❌ Error loading dataset:', error.message);
            throw error;
        }
    }

    /**
     * Index conversation by emotional keywords
     */
    _indexConversation(userInput, aiResponse) {
        const keywords = this._extractKeywords(userInput.toLowerCase());

        keywords.forEach(keyword => {
            if (!this.keywordIndex.has(keyword)) {
                this.keywordIndex.set(keyword, []);
            }
            this.keywordIndex.get(keyword).push({
                user: userInput,
                ai: aiResponse,
            });
        });
    }

    /**
     * Extract emotional keywords from user input
     */
    _extractKeywords(text) {
        const emotionalKeywords = [
            'lonely', 'alone', 'isolated',
            'stress', 'stressed', 'anxious', 'anxiety', 'worried',
            'sad', 'depressed', 'down', 'unhappy',
            'fail', 'failed', 'failure', 'mistake',
            'sleep', 'tired', 'exhausted', 'insomnia',
            'motivate', 'motivation', 'inspire',
            'help', 'support', 'need',
            'friend', 'care', 'love',
            'useless', 'worthless', 'hopeless',
            'joke', 'funny', 'laugh',
            'hi', 'hello', 'hey',
            'thank', 'thanks', 'grateful',
            'angry', 'mad', 'frustrated',
            'scared', 'afraid', 'fear',
            'happy', 'good', 'great',
        ];

        const found = [];
        emotionalKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                found.push(keyword);
            }
        });

        return found.length > 0 ? found : ['general'];
    }

    /**
     * Find best matching response from cache
     * Returns null if no good match found
     */
    findResponse(userInput) {
        if (!this.loaded) {
            console.warn('⚠️  Dataset not loaded yet');
            return null;
        }

        const keywords = this._extractKeywords(userInput.toLowerCase());

        // Try to find exact keyword match
        for (const keyword of keywords) {
            const matches = this.keywordIndex.get(keyword);
            if (matches && matches.length > 0) {
                // Return random response from matches for variety
                const randomIndex = Math.floor(Math.random() * matches.length);
                return matches[randomIndex].ai;
            }
        }

        return null;
    }

    /**
     * Get a random conversation example for personality reference
     */
    getRandomExample() {
        if (this.conversations.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.conversations.length);
        return this.conversations[randomIndex];
    }

    /**
     * Get dataset statistics
     */
    getStats() {
        return {
            totalConversations: this.conversations.length,
            uniqueKeywords: this.keywordIndex.size,
            loaded: this.loaded,
        };
    }
}

// Singleton instance
const datasetLoader = new DatasetLoader();

module.exports = datasetLoader;
