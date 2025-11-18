import './env.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(`${process.env.DATABASE_URI}`);

export default sql;



