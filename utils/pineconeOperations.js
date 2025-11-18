import pinecone from '../configs/pinecone.js'

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME );


export const upsertEmbedding = async (reportId, embeddings) => {

        // Store in Pinecone
        const vectorId = `report_${reportId}_${Date.now()}`;
        
        await index.upsert({
            upsertRequest: {
                vectors: [{
                    id: vectorId,
                    values: embedding,
                    metadata: {
                        reportId: reportId,
                        textPreview: mainChunk.substring(0, 200),
                        createdAt: new Date().toISOString()
                    }
                }]
            }
        });
        
        console.log(`- Vector stored in Pinecone with ID: ${vectorId}`);
        
}