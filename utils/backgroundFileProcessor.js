// import sql from '../configs/db.js';
// import s3 from '../configs/awsS3.js';
// import pinecone from '../configs/pinecone.js';
// import { GetObjectCommand } from "@aws-sdk/client-s3";
// import { extractText } from './textExtractor.js';
// import { generateEmbedding } from './embeddingGenerator.js';

// export const processFileInBackground = async (reportId, fileName) => {
//     let extractedText = null;
//     let embeddings = null;
//     let textChunks = null;
//     try {
//         console.log(`- Starting background processing for report: ${reportId}`);

//         // Step 1: Extract text
//         // Download file from S3

//         const s3Params = {
//             Bucket: process.env.S3_BUCKET_NAME,
//             Key: fileName
//         };

//         console.log(`- Downloading file from S3: ${fileName}`);
//         const command = new GetObjectCommand(s3Params);
//         const s3Object = await s3.send(command);

//         // s3Object.Body is a stream in v3, so you need to convert it to a buffer:
//         const streamToBuffer = async (stream) => {
//             return new Promise((resolve, reject) => {
//                 const chunks = [];
//                 stream.on("data", (chunk) => chunks.push(chunk));
//                 stream.on("error", reject);
//                 stream.on("end", () => resolve(Buffer.concat(chunks)));
//             });
//         };

//         const fileBuffer = await streamToBuffer(s3Object.Body);

//         // const s3Params = {
//         //     Bucket: process.env.S3_BUCKET_NAME,
//         //     Key: fileName
//         // };

//         // console.log(`- Downloading file from S3: ${fileName}`);
//         // const s3Object = await s3.getObject(s3Params).promise();
//         // const fileBuffer = s3Object.Body;

//         extractedText = await extractText("Report Upload", fileBuffer);

//         await sql`
//             UPDATE reports 
//             SET extracted_text = ${extractedText}, 
//                 extraction_status = 'completed',
//                 updated_at = NOW()
//             WHERE id = ${reportId}
//        `;

//     }
//     catch (error) {
//         console.log(`- Text Extraction failed for report: ${reportId}`);
//         console.error(error);
//         await sql`
//             UPDATE reports 
//             SET extraction_status = 'failed',
//                 updated_at = NOW()
//             WHERE id = ${reportId}
//        `;

//     }
//     if (extractedText) {

//         try {
//             // Step 2: Generate embeddings
//             const result = await generateEmbedding(reportId, extractedText);
//             textChunks = result.textChunks;
//             embeddings = result.embeddings;

//             //await upsertEmbedding(reportId, embeddings)
//             //  await sql`
//             //     INSERT INTO embeddings (report_id, vector_id, created_at)
//             //     VALUES (${reportId}, ${vectorId}, NOW())
//             // `;

//             // Update report status

//             await sql`
//             UPDATE reports 
//             SET embedding_status = 'completed',
//                 updated_at = NOW()
//             WHERE id = ${reportId}
//         `;

//         } catch (error) {
//             console.log(`- Embeddings Generation failed for report: ${reportId}`);
//             console.error(error);

//             await sql`
//             UPDATE reports 
//             SET embedding_status = 'failed',
//                 updated_at = NOW()
//             WHERE id = ${reportId}
//        `;

//         }
//     }else{
//         console.log(`- No extracted text found for report: ${reportId}`);
//     }
//     if (embeddings && textChunks) {
//         try {

//             console.log(`- Started indexing vectors in Pinecone for report: ${reportId}`);

//             const pcIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
//             // Step 3: Store in Pinecone
//             const vectors = textChunks.map((chunk, i) => ({
//                 id: `${reportId}_chunk_${i}`,
//                 values: embeddings[i],
//                 metadata: {
//                     reportId: reportId,
//                     textPreview: chunk.substring(0, 400),
//                     createdAt: new Date().toISOString()
//                 }
//             }));

//             // Pass the array directly, not wrapped in an object
//             await pcIndex.upsert(vectors);


//             console.log(`- Vectors stored in Pinecone for report: ${reportId}`);

//             console.log(`- Background processing completed for report: ${reportId}`);
//         }
//         catch (error) {
//             console.error(`- Vectors failed to store in Pinecone for report: ${reportId}, error: ${error}`);
//             console.error(`- Background processing failed for report: ${reportId}, error: ${error}`);


//         }
//     }
//     else {
//         console.log(`- No embeddings or text chunks generated for report: ${reportId}`);
//     }
// };


import sql from '../configs/db.js';
import s3 from '../configs/awsS3.js';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prepareTextChunks } from './textProcessor.js';
import { upsertReportChunks } from './pineconeOperations.js';

export const processFileInBackground = async (reportId, fileName) => {
    let textChunks = null;

    try {
        console.log(`- Starting background processing for report: ${reportId}`);

        // Step 1: Extract text from S3
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName
        };

        console.log(`- Downloading file from S3: ${fileName}`);
        const command = new GetObjectCommand(s3Params);
        const s3Object = await s3.send(command);

        const streamToBuffer = async (stream) => {
            return new Promise((resolve, reject) => {
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("error", reject);
                stream.on("end", () => resolve(Buffer.concat(chunks)));
            });
        };

        const fileBuffer = await streamToBuffer(s3Object.Body);
        textChunks = await prepareTextChunks("Report Upload", fileBuffer);

        await sql`
            UPDATE reports 
            SET extraction_status = 'completed',
                updated_at = NOW()
            WHERE id = ${reportId}
        `;

    } catch (error) {
        console.error(`- Text Extraction failed for report: ${reportId}. Error: ${error}`);
        
        await sql`
            UPDATE reports 
            SET extraction_status = 'failed',
                updated_at = NOW()
            WHERE id = ${reportId}
        `;
    }

    if (textChunks) {
        try {
            console.log(`- Started indexing vectors in Pinecone for report: ${reportId}`);

            await upsertReportChunks(reportId, textChunks);
            await sql`
            UPDATE reports 
            SET indexing_status = 'completed',
                updated_at = NOW()
            WHERE id = ${reportId}
        `;

            console.log(`- Vectors stored in Pinecone for report: ${reportId}`);
            console.log(`- Background processing completed for report: ${reportId}`);

        } catch (error) {
             await sql`
            UPDATE reports 
            SET indexing_status = 'failed',
                updated_at = NOW()
            WHERE id = ${reportId}
        `;
            console.error(`- Vectors failed to store in Pinecone for report: ${reportId}, error: ${error}`);
            console.error(`- Background processing failed for report: ${reportId}, error: ${error}`);
        }
    } else {
        console.log(`- No text chunks generated for report: ${reportId}`);
    }
};