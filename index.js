const express = require('express');
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

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

const corsOptions = {
  origin: `http://localhost:${process.env.FRONTEND_PORT}`
};

app.use(cors(corsOptions));

app.use(jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://dev-lzpdqmdb2yfnmavu.us.auth0.com/.well-known/jwks.json'
    }),
    audience: process.env.AUDIENCE,
    issuer: process.env.ISSUER_BASE_URL,
    algorithms: ['RS256']
}));

app.use(bodyParser.json());

app.get('/appointments', async function(req, res) {
    try {
        const permissions = req.auth.permissions;
        if (permissions && permissions.includes('read:appointments')) {
            const result = await pool.query('SELECT * FROM appointments');
            res.status(200).json(result.rows);
        } else {
            res.status(403).send('Forbidden: You do not have the required permission.');
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/appointment', async function(req, res) {
    const { description, date } = req.body;

    try {
        const permissions = req.auth.permissions;
        if (permissions && permissions.includes('write:appointments')) {
            await pool.query('INSERT INTO appointments (description, date) VALUES ($1, $2)', 
                [description, date]);
            res.status(201).json({ message: 'Appointment added successfully' });
        } else {
            res.status(403).send('Forbidden: You do not have the required permission.');
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({ message: 'Invalid token or no token provided.' });
  }
  next(err);
});

app.listen(process.env.SERVER_PORT);
console.log(`Listening on http://localhost:${process.env.SERVER_PORT}`);
