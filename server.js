const express = require('express');
const app = express();
const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.ISSUER_BASE_URL || !process.env.AUDIENCE) {
  throw 'Make sure you have ISSUER_BASE_URL, and AUDIENCE in your .env file';
}

const pool = new Pool({
    user: process.env.USERNAME,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT,
});

const corsOptions =  {
  origin: `http://localhost:${process.env.FRONTEND_PORT}` // front end url
};


app.use(cors(corsOptions));

app.use(auth({
    issuer: process.env.ISSUER_BASE_URL,
    audience: process.env.AUDIENCE,
    getToken: (req) => req.headers.authorization.split(' ')[1]  // Extract the token from Bearer
}));

app.use(bodyParser.json());


app.get('/appointments', requiredScopes('read:appointments'), async function(req, res) {
    try {
        const result = await pool.query('SELECT * FROM appointments');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/appointment', requiredScopes('write:appointments'), async function(req, res) {
    const { description, date } = req.body;

    try {
        await pool.query('INSERT INTO appointments (description, date) VALUES ($1, $2)', 
            [description, date]);
        res.status(201).json({ message: 'Appointment added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.use(function(err, req, res, next){
  console.error(err.stack);
  return res.set(err.headers).status(err.status).json({ message: err.message });
});

app.listen(process.env.SERVER_PORT); // backend port
console.log(`Listening on http://localhost:${process.env.SERVER_PORT}`);