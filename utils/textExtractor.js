import s3 from '../configs/awsS3.js';
import pdf from 'pdf-parse';


const extractTextFromPDF = (pdfBuffer) => {
  return new Promise((resolve, reject) => {
    pdf(pdfBuffer).then(function(data) {
      resolve(data.text);
    }).catch(function(error) {
      reject(error);
    });
  });
};

export const extractText = async (task, fileBuffer) => {

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
        
        
        console.log(`- Text extraction completed. Length: ${cleanedText.length} characters. Task: ${task}`);
        return cleanedText;
        
    
};


/*export const extractTextForSearch = async (fileBuffer) => {

      console.log('- Text extraction started for search process');

       
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
        
        
        console.log(`- Text extraction completed for search process. Length: ${cleanedText.length} characters`);
        return cleanedText;
        
    
};*/