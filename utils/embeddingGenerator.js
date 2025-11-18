import hf from "../configs/huggingFace.js";

export const generateEmbedding = async (reportId, extractedText) => {

    console.log(`- Generating embedding for report: ${reportId}`);

    // Chunk text if too long (Hugging Face has token limits)
    const maxLength = 512; // tokens
    const textChunks = chunkText(extractedText, maxLength);

    console.log(`- Processing ${textChunks.length} text chunks`);

    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
        textChunks.map(async (chunk) => {
            const embedding = await hf.featureExtraction({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: chunk
            });

            // HuggingFace returns nested array, flatten it
            return Array.isArray(embedding[0]) ? embedding[0] : embedding;
        })
    );

    console.log(`- Embedding generated, dimension: ${embeddings[0].length}`);
    console.log('- Embeddings count:', embeddings.length);

    return {
        textChunks,
        embeddings
    };


};

export const generateEmbeddingForSearch = async (extractedText) => {

    console.log(`- Generating embedding for search process`);

    const maxLength = 512;
    const textChunks = chunkText(extractedText, maxLength);

    console.log(`- Processing ${textChunks.length} text chunks`);

    const chunkEmbeddings = await Promise.all(
        textChunks.map(async (chunk, index) => {
            const embedding = await hf.featureExtraction({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: chunk
            });

            return {
                embedding: Array.isArray(embedding[0]) ? embedding[0] : embedding,
                text: chunk.substring(0, 400), // Preview for metadata
                chunkIndex: index
            };
        })
    );
    console.log(`- Embedding generated for search process, dimension: ${chunkEmbeddings.length}`);

    return chunkEmbeddings;
};

/*export const generateEmbeddingForSearch = async (extractedText) => {
    
    console.log(`- Generating embedding for search process`);

    const maxLength = 512; // tokens
    const textChunks = chunkText(extractedText, maxLength);

    console.log(`- Processing ${textChunks.length} text chunks`);

    const chunkEmbeddings = await Promise.all(
        textChunks.map(async (chunk) => {
            const embedding = await hf.featureExtraction({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: chunk
            });

            return Array.isArray(embedding[0]) ? embedding[0] : embedding;
        })
    );

    // ✅ Average embeddings into a single vector for Pinecone query
    const dimension = chunkEmbeddings[0].length;
    const averagedEmbedding = Array(dimension).fill(0);

    chunkEmbeddings.forEach(vec => {
        for (let i = 0; i < dimension; i++) {
            averagedEmbedding[i] += vec[i];
        }
    });

    for (let i = 0; i < dimension; i++) {
        averagedEmbedding[i] /= chunkEmbeddings.length;
    }

    console.log(`- Embedding generated for search process, dimension: ${averagedEmbedding.length}`);

    return averagedEmbedding; 
};*/




// Helper function to chunk text
const chunkText = (text, maxTokens) => {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = [];

    for (const word of words) {
        currentChunk.push(word);

        // Rough estimate: 1 token ≈ 0.75 words
        if (currentChunk.length >= maxTokens * 0.75) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    // Add remaining words
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks.length > 0 ? chunks : [text];
};