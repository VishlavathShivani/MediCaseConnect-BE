import pdf from 'pdf-parse';


const extractTextFromPDF = (pdfBuffer) => {
  return new Promise((resolve, reject) => {
    pdf(pdfBuffer).then(function (data) {
      resolve(data.text);
    }).catch(function (error) {
      reject(error);
    });
  });
};

export const prepareTextChunks = async (task, fileBuffer) => {

  console.log(`- Text extraction started for file, Task: ${task}`);

  const pdfText = await extractTextFromPDF(fileBuffer);

  // Clean and preprocess text
  const cleanedText = pdfText
    .replace(/\n+/g, ' ')      // Replace multiple newlines
    .replace(/\s+/g, ' ')      // Replace multiple spaces
    .replace(/[^\w\s.,!?;:()\-]/g, '') // Remove special characters but keep basic punctuation
    .trim();

  if (!cleanedText || cleanedText.length < 10) {
    throw new Error('Extracted text is too short or empty');
  }

  console.log(`- Text extraction completed: Task: ${task}, Length: ${cleanedText.length} characters. `);

  console.log(`- Preparing text chunks`);

  const maxLength = 1000;
  const textChunks = chunkText(cleanedText, maxLength);

  console.log('- Chunks count:', textChunks.length);

  return textChunks;

};


export const chunkText = (text, maxTokens) => {
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