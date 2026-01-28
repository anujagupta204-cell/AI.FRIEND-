/**
 * Latency Testing Script
 * Measures end-to-end response time for Voice AI Friend
 */

const datasetLoader = require('./dataset-loader');
const aiPipeline = require('./ai-pipeline');

async function testLatency() {
    console.log('🧪 Voice AI Friend - Latency Test\n');
    console.log('='.repeat(50));

    // Load dataset
    console.log('\n📚 Loading dataset...');
    await datasetLoader.load();

    // Test cases
    const testCases = [
        'I feel lonely',
        'I am stressed',
        'Motivate me',
        'I failed',
        'Tell me a joke',
        'I need a friend',
        'This is a completely novel input that is not in the dataset',
    ];

    console.log('\n🎯 Running latency tests...\n');

    const results = [];

    for (const input of testCases) {
        const result = await aiPipeline.generateResponse(input);
        results.push({
            input,
            latency: result.latency,
            source: result.source,
            response: result.response,
        });

        console.log(`Input: "${input}"`);
        console.log(`Latency: ${result.latency}ms`);
        console.log(`Source: ${result.source}`);
        console.log(`Response: "${result.response}"`);
        console.log('-'.repeat(50));
    }

    // Calculate statistics
    const cacheResults = results.filter(r => r.source === 'cache');
    const llmResults = results.filter(r => r.source === 'llm');

    const avgCacheLatency = cacheResults.length > 0
        ? cacheResults.reduce((sum, r) => sum + r.latency, 0) / cacheResults.length
        : 0;

    const avgLLMLatency = llmResults.length > 0
        ? llmResults.reduce((sum, r) => sum + r.latency, 0) / llmResults.length
        : 0;

    console.log('\n📊 Results Summary');
    console.log('='.repeat(50));
    console.log(`Total tests: ${results.length}`);
    console.log(`Cache hits: ${cacheResults.length}`);
    console.log(`LLM calls: ${llmResults.length}`);
    console.log(`\nAverage cache latency: ${avgCacheLatency.toFixed(2)}ms`);
    console.log(`Average LLM latency: ${avgLLMLatency.toFixed(2)}ms`);

    // Performance assessment
    console.log('\n✅ Performance Assessment');
    console.log('='.repeat(50));

    if (avgCacheLatency < 10) {
        console.log('✅ Cache latency: EXCELLENT (<10ms)');
    } else if (avgCacheLatency < 50) {
        console.log('✅ Cache latency: GOOD (<50ms)');
    } else {
        console.log('⚠️  Cache latency: NEEDS OPTIMIZATION (>50ms)');
    }

    if (avgLLMLatency < 500) {
        console.log('✅ LLM latency: EXCELLENT (<500ms)');
    } else if (avgLLMLatency < 1000) {
        console.log('✅ LLM latency: GOOD (<1s)');
    } else {
        console.log('⚠️  LLM latency: NEEDS OPTIMIZATION (>1s)');
    }

    // Dataset stats
    const datasetStats = datasetLoader.getStats();
    const pipelineStats = aiPipeline.getStats();

    console.log('\n📈 System Statistics');
    console.log('='.repeat(50));
    console.log(`Dataset conversations: ${datasetStats.totalConversations}`);
    console.log(`Unique keywords: ${datasetStats.uniqueKeywords}`);
    console.log(`Cache hit rate: ${pipelineStats.hitRate}`);
    console.log(`LLM enabled: ${pipelineStats.llmEnabled}`);

    console.log('\n✅ Test complete!\n');
    process.exit(0);
}

// Run tests
testLatency().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
