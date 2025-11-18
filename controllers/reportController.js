import sql from '../configs/db.js'
import pinecone from '../configs/pinecone.js';
import s3 from '../configs/awsS3.js'
import path from 'path';
import { DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { processFileInBackground } from '../utils/backgroundFileProcessor.js'
import { extractText } from '../utils/textExtractor.js';
import { generateEmbeddingForSearch } from '../utils/embeddingGenerator.js';


export const uploadReport = async (req, res) => {
    try {
        if (!req.file) {

            return res.status(400).json({ error: 'File upload failed.' });

        } else {
            console.log('- File uploaded to s3, processing further');
        }

        console.log("- Started Report Metadata Upload in Database");

        const { clinicianId, deptCode, branchCode } = req.body;
        let { tags } = req.body;

        // Handle different tag formats from Postman
        if (typeof tags === 'string') {
            try {
                // If it's a JSON string: '["cardiac", "hypertension"]'
                tags = JSON.parse(tags);
            } catch (e) {
                // If it's a single string: 'cardiac'
                tags = [tags];
            }
        } else if (Array.isArray(tags)) {
            // Already an array: ['cardiac', 'hypertension']
            tags = tags;
        } else {
            // Default to empty array
            tags = [];
        }
        const s3Url = req.file.location;
        const filenameInS3 = req.file.uploadedFileName;


        const report = await sql`INSERT INTO reports (clinician_id, file_name, s3_url, dept_code, branch_code, diagnosis_tags)
      VALUES (${clinicianId}, ${path.basename(filenameInS3)}, ${s3Url}, ${deptCode}, ${branchCode}, ${tags})
      RETURNING id, uploaded_at`;


        const responseData = {
            success: true,
            reportId: report[0].id,
            uploadedAt: report[0].uploaded_at,
            message: 'File uploaded successfully and queued for processing to vector database'
        };

        res.status(201).json(responseData);
        console.log(responseData);

        processFileInBackground(responseData.reportId, filenameInS3);


    } catch (error) {
        console.error('- Database Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

export const searchByQuery = async (req, res) => {
    try {
        console.log("- Started Search by Query");

        const query = req.body.query;
        if (!query || query.trim() === "") {
            return res.status(400).json({ success: false, error: "Query text is required" });
        }

        const results = await commonSearchHelper(query);

        console.log("- Completed Search by Query");

        res.json({ success: true, reports: results });


    } catch (error) {
        console.error("- Failed to Search", error.message)
        res.status(500).json({ 
            success: false, error: error.message });
    }
}

const commonSearchHelper = async (extractedText) => {

    const chunkEmbeddings = await generateEmbeddingForSearch(extractedText);

    const pcIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    // Search with each chunk embedding
    const searchPromises = chunkEmbeddings.map((chunk, index) =>
        pcIndex.query({
            topK: 15, // Lower per chunk since we combine
            includeValues: false,
            includeMetadata: true,
            vector: chunk.embedding
        })
    );

    const allResults = await Promise.all(searchPromises);

    // Combine and deduplicate results by reportId
    const documentMap = new Map();

    allResults.forEach((result, chunkIndex) => {
        result.matches.forEach(match => {
            const docId = match.metadata.reportId;

            if (!documentMap.has(docId)) {
                documentMap.set(docId, {
                    bestMatch: match,
                    maxScore: match.score,
                    matchingChunks: 1,
                    sourceChunk: chunkIndex
                });
            } else {
                const existing = documentMap.get(docId);
                if (match.score > existing.maxScore) {
                    existing.bestMatch = match;
                    existing.maxScore = match.score;
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
            ...item.bestMatch,
            matchingChunks: item.matchingChunks,
            sourceChunkIndex: item.sourceChunk
        }));
    
    
    const reportIds = finalResults.map(r => r.metadata.reportId);
    const reports = await sql`SELECT id, clinician_id, clinician_name, file_name, s3_url, diagnosis_tags, dept_code,dept_logo_url, branch_code, uploaded_at FROM reports_master_view WHERE is_deleted = false AND id = ANY(${reportIds}) `;

        
    return reports;
};

export const searchByFile = async (req, res) => {
    try {
        console.log("- Started Search by File");
        console.log(req.body);
        console.log(req.file);

        const extractedText = await extractText("Running Search", req.file.buffer);

        const results = await commonSearchHelper(extractedText);

        console.log("- Completed Search by File");

        res.json({ success: true, reports: results });
       


    } catch (error) {
        console.error("Failed to Search, ", error.message);
        res.status(500).json({ 
            success: false, error: error.message });
    }
};

export const getReports = async (req, res) => {
    try {
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) page = 1;
        const limit = 5;
        const offset = (page - 1) * limit;

        const {
            clinician_id,
            extraction_status,
            embedding_status,
            dept_code,
            branch_code,
            uploaded_from,
            uploaded_to,
            file_name
        } = req.query;

        let { tags } = req.query;

        // Ensure tags is always an array
        if (typeof tags === "string" && tags.startsWith("[")) {
            tags = JSON.parse(tags);
        } else if (typeof tags === "string" && tags.length > 0) {
            tags = [tags];
        } else if (!Array.isArray(tags)) {
            tags = [];
        }

        // First: get total count for filtered reports
        const totalResult = await sql`
            SELECT COUNT(*) AS total
            FROM reports_master_view
            WHERE is_deleted = false AND
                (${clinician_id || null}::INT IS NULL OR clinician_id = ${clinician_id}) AND
                (${extraction_status || null}::TEXT IS NULL OR extraction_status = ${extraction_status}) AND
                (${embedding_status || null}::TEXT IS NULL OR embedding_status = ${embedding_status}) AND
                (${dept_code || null}::TEXT IS NULL OR dept_code = ${dept_code}) AND
                (${branch_code || null}::TEXT IS NULL OR branch_code = ${branch_code}) AND
                (${uploaded_from || null}::DATE IS NULL OR uploaded_at >= ${uploaded_from}) AND
                (${uploaded_to || null}::DATE IS NULL OR uploaded_at <= ${uploaded_to}) AND
                (${file_name || null}::TEXT IS NULL OR file_name ILIKE ${file_name + '%'}) AND
                (${tags && tags.length > 0 ? sql`${tags}::TEXT[] && diagnosis_tags` : sql`TRUE`});
        `;
        const totalCount = totalResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);

        // Second: fetch paginated filtered reports
        const reports = await sql`
            SELECT 
                id,
                clinician_id,
                clinician_name,
                file_name,
                s3_url,
                extraction_status,
                embedding_status,
                diagnosis_tags,
                dept_code,
                dept_logo_url,
                branch_code,
                uploaded_at
            FROM reports_master_view
            WHERE is_deleted = false AND
                (${clinician_id || null}::INT IS NULL OR clinician_id = ${clinician_id}) AND
                (${extraction_status || null}::TEXT IS NULL OR extraction_status = ${extraction_status}) AND
                (${embedding_status || null}::TEXT IS NULL OR embedding_status = ${embedding_status}) AND
                (${dept_code || null}::TEXT IS NULL OR dept_code = ${dept_code}) AND
                (${branch_code || null}::TEXT IS NULL OR branch_code = ${branch_code}) AND
                (${uploaded_from || null}::DATE IS NULL OR uploaded_at >= ${uploaded_from}) AND
                (${uploaded_to || null}::DATE IS NULL OR uploaded_at <= ${uploaded_to}) AND
                (${file_name || null}::TEXT IS NULL OR file_name ILIKE ${file_name + '%'}) AND
                (${tags && tags.length > 0 ? sql`${tags}::TEXT[] && diagnosis_tags` : sql`TRUE`})
            ORDER BY uploaded_at DESC
            LIMIT ${limit} OFFSET ${offset};
        `;

        res.json({
            success: true,
            message: "Reports filtered successfully",
            page,
            limit,
            totalCount,
            totalPages,
            reports
        });
    } catch (error) {
        console.error("Error searching reports:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// export const getReports = async (req, res) => {
//     try {
//         const limit = 5;
//         const page = parseInt(req.query.page) || 1;
//         const offset = (page - 1) * limit;

//         // Get total count of non-deleted reports
//         const totalResult = await sql`SELECT COUNT(*) AS total FROM reports_master_view WHERE is_deleted = false`;
//         const totalCount = totalResult[0].total;

//         // Get paginated reports
//         const reports = await sql`
//             SELECT id, clinician_id, clinician_name, file_name, s3_url, embedding_status, diagnosis_tags, dept_code, dept_logo_url, branch_code, uploaded_at
//             FROM reports_master_view
//             WHERE is_deleted = false
//             ORDER BY uploaded_at DESC
//             LIMIT ${limit} OFFSET ${offset}
//         `;

//         res.json({
//             success: true,
//             message: "Reports retrieved successfully",
//             page,
//             limit,
//             totalCount,              // <-- add totalCount
//             totalPages: Math.ceil(totalCount / limit),  // <-- add totalPages
//             reports
//         });

//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// }

export const deleteReportById = async (req, res) => {
    try {
        // const { userId } = getAuth(req);
        const { id } = req.params;

        // Step 1: ONLY update database immediately (fast, reliable)
        const report = await sql`
      UPDATE reports 
      SET 
        is_deleted = true,
        deleted_at = NOW()
      WHERE id = ${id} AND is_deleted = false
      RETURNING id, file_name
    `;

        if (!report.length) {
            return res.status(404).json({ error: 'Report not found or already deleted' });
        }

        // Step 2: Respond immediately to user
        res.json({
            success: true,
            message: "Report deleted successfully",
            reportId: report[0].id
        });


        // Step 3: Async cleanup (fire and forget)
        setImmediate(() => {
            cleanupDeletedReportAsync(id, report[0].file_name);
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Async cleanup function
export const cleanupDeletedReportAsync = async (reportId, filename) => {
    try {
        // Move S3 file
        const deletedS3Key = `reports/deleted/${filename}`;

        await s3.send(new CopyObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            CopySource: `${process.env.S3_BUCKET_NAME}/reports/${filename}`,
            Key: deletedS3Key
        }));

        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `reports/${filename}`
        }));

        const newS3Url = `${process.env.S3_ENDPOINT}/${deletedS3Key}`;

        // Update s3_key in database
        await sql`
      UPDATE reports 
      SET s3_url = ${newS3Url} 
      WHERE id = ${reportId}
    `;

    // Delete Pinecone vectors
    const pcIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    await pcIndex.deleteMany({
    reportId: { $eq: Number(reportId) },
    });

    console.log(`- Async cleanup completed for report ${reportId}`);


    } catch (error) {
        console.error(`- Async cleanup failed for report ${reportId}:`, error);
        // Could log to monitoring system or retry queue
    }
};


