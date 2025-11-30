// services/pineconeService.js
import pinecone from '../configs/pinecone.js';

const pcIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Upsert records for upload
export const upsertReportChunks = async (reportId, textChunks) => {
    
    
    const vectors = textChunks.map((chunk, i) => ({
        id: `${reportId}_chunk_${i}`,
        text: chunk,
        reportId: reportId,
        createdAt: new Date().toISOString()
    }));
    
    await pcIndex.upsertRecords(vectors);
  
};

// Search and deduplicate
export const searchSimilarReports = async (textChunks) => {
    console.log(`- Searching with ${textChunks.length} chunks`);
    
    const searchPromises = textChunks.map((chunk) =>
        pcIndex.searchRecords({
            query: {
                inputs: { text: chunk },
                topK: 15
            },
            fields: ['reportId']
        })
    );
    
    const allResults = await Promise.all(searchPromises);
    
    // Deduplicate and rank
    const documentMap = new Map();
    
    allResults.forEach((result, chunkIndex) => {
        result.result.hits.forEach(hit => {
            const docId = hit.fields.reportId;
            
            if (!documentMap.has(docId)) {
                documentMap.set(docId, {
                    bestMatch: hit,
                    maxScore: hit._score,
                    matchingChunks: 1,
                    sourceChunk: chunkIndex
                });
            } else {
                const existing = documentMap.get(docId);
                if (hit._score > existing.maxScore) {
                    existing.bestMatch = hit;
                    existing.maxScore = hit._score;
                    existing.sourceChunk = chunkIndex;
                }
                existing.matchingChunks++;
            }
        });
    });
    
    // Convert to array and sort by best score
    const finalResults = Array.from(documentMap.values())
        .sort((a, b) => b.maxScore - a.maxScore)
        .slice(0, 20)
        .map(item => ({
            id: item.bestMatch._id,
            score: item.bestMatch._score,
            fields: item.bestMatch.fields,
            matchingChunks: item.matchingChunks,
            sourceChunkIndex: item.sourceChunk
        }));
    
    // Fetch full report details from database
    const reportIds = finalResults.map(r => r.fields.reportId);
    
    
    return reportIds;
};