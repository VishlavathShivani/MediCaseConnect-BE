import { InferenceClient } from '@huggingface/inference';

 // Initialize Hugging Face
const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);


export default hf