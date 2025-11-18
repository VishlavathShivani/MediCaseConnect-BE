import express from 'express'
import './configs/env.js';
import dotenv from "dotenv-flow";
dotenv.config();


//import 'dotenv/config'
import cors from 'cors'
import sql from './configs/db.js';
import adminRouter from './routes/adminRoutes.js';
import reportRouter from './routes/reportRoutes.js';

const app=express();

//Middleware
//app.use(cors())
//const corrs = require('cors')
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())


app.get('/', async (req, res) => {
  const response = await sql`SELECT version()`;
  const { version } = response[0];
  res.json({ message: "API is working", version });
});


app.use('/api/reports', reportRouter)
app.use('/api/admin', adminRouter)



const PORT = process.env.PORT || 3000;

app.listen( PORT, ()=>{
    console.log("Server is up on port: " + PORT)
})


export default app