const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
require('dotenv').config();

const allowedOrigins = [
  'http://localhost:8000',
  'http://localhost:3000',
  'https://log-in-demo.herokuapp.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
}

const credentials = (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
}

app.use(credentials); // Must before CORS! Handle options credentials check and fetch cookies credentials requirement.
app.use(cors(corsOptions)); // Cross Origin Resource Sharing
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); //Enable to parse JSON in req.body
app.use(cookieParser()); // Middleware for cookies

const client = require("./db.js");
const db = client.db('sign-in-demo');
const usersCollection = db.collection('users');

//////////////////////////////////////////////////////////////////////////////
// Middleware to verify JWT token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.sendStatus(401);
  }
  console.log(authHeader);
  const token = authHeader.split(' ')[1];

  jwt.verify(
    token, 
    process.env.ACCESS_TOKEN_SECRET, 
    (err, decoded) => {
      if (err) return res.sendStatus(403); // invalid token
      req.email = decoded.email; // Here decoded is email.
      next();
    }
  );
}

//////////////////////////////////////////////////////////////////////////////
// For testing purpose, get all registered emails with JWT verification.
app.get('/api/users', verifyJWT, async (req, res) => {
  try {
    const result = await usersCollection
      .find({})
      .project({ _id: 0, email: 1 })
      .toArray();
    res.json(result);
  }
  catch (err) {
    console.log(err);
  }
})
//////////////////////////////////////////////////////////////////////////////
// Refresh JWT accessToken
app.get('/api/refresh', async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    return res.sendStatus(401);
  }
  console.log(cookies.jwt);
  const refreshToken = cookies.jwt;

  try {
    // search the refreshToken
    const resultFind = await usersCollection.findOne({
      refreshToken,
    });
    if(!resultFind) {
      return res.sendStatus(403); // Forbidden
    }

    // evaluate jwt refreshToken
    jwt.verify(
      refreshToken, 
      process.env.REFRESH_TOKEN_SECRET, 
      (err, decoded) => {
        if (err || resultFind.email !== decoded.email) {
          return res.sendStatus(403);
        } 
        const accessToken = jwt.sign(
          { "email": resultFind.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '300s' }
        );
        res.json({ accessToken });
      }
    );
  }
  catch (err) {
    res.status(500).json({'message': err.message});
  }
});
//////////////////////////////////////////////////////////////////////////////
// Logout and Delete JWT refreshToken
app.get('/api/logout', async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    return res.sendStatus(204); // No content
  }
  const refreshToken = cookies.jwt;

  try {
    // search the refreshToken
    const resultFind = await usersCollection.findOne({
      refreshToken,
    });
    if(!resultFind) {
      res.clearCookie('jwt', { 
        httpOnly: true, 
        sameSite: 'None', 
        secure: true 
      }).status(204);
    }

    // Delete refreshToken with current user
    const resultDeleteToken = await usersCollection.updateOne(
      {refreshToken: { $eq: resultFind.refreshToken }}, 
      {$set: { refreshToken: '' }}
    );
    res.clearCookie('jwt', { 
      httpOnly: true, 
      sameSite: 'None', 
      secure: true 
    }).status(204);
    // .json({message: 'Logout Success'});
  }
  catch (err) {
    res.status(500).json({'message': err.message});
  }
});

//////////////////////////////////////////////////////////////////////////////
// user sign up
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  // check if the email and password are empty
  if (!email || !password) {
    return res.status(400).json({'message': 'Email and password are required.'})
  }

  try {
    // check for duplicate emails in the db
    const resultFind = await usersCollection.findOne({
      email,
    });
    if (resultFind) {
      return res.status(409).json({'message': 'The email has already existed, please change to another one.'});
    }

    // encrypt the password, salt is 10
    const hashedPwd = await bcrypt.hash(password, 10);
    
    // insert a new email and password.
    const result = await usersCollection.insertOne({
      email,
      password: hashedPwd,
    });
    res.status(201).json({message: `Register Success ===> ${email}`});
  }
  catch (err) {
    res.status(500).json({'message': err.message});
  }
});

//////////////////////////////////////////////////////////////////////////////
// user sign in
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // check if the email and password are empty
  if (!email || !password) {
    return res.status(400).json({'message': 'Email and password are required.'})
  }

  try {
    // search the email
    const resultFind = await usersCollection.findOne({
      email,
    });

    if(!resultFind) {
      return res.sendStatus(401); // Unauthorized, email not found
    }

    // evaluate password
    const match = await bcrypt.compare(password, resultFind.password);
    if (match) {
      // create JWTs
      const accessToken = jwt.sign(
        { "email": resultFind.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '300s' }
      );

      const refreshToken = jwt.sign(
        { "email": resultFind.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1d' }
      );

      // Saving refreshToken with current user
      const resultRefreshToken = await usersCollection.updateOne(
        {email: { $eq: resultFind.email }}, 
        {$set: { refreshToken }}
      );
      console.log(resultRefreshToken);

      res.cookie('jwt', refreshToken, { 
        httpOnly: true, 
        sameSite: 'None', 
        secure: true, 
        maxAge: 24 * 60 * 60 * 1000 
      });
      res.status(201).json({ accessToken, message: `Login Success ===> ${email}`});
    } else {
      res.sendStatus(401); // Unauthorized, password not match
    }
  }
  catch (err) {
    res.status(500).json({'message': err.message});
  }
});

app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

module.exports = app