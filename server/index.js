const express = require("express");
const db = require("./data/db.js");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const server = express();
server.use(express.json());
server.use(cors());

const secret = "hi poof";

function generateToken(user) {
  const payload = {
    username: user.username,
    department: user.department
  };
  const options = {
    expiresIn: "2h",
    jwtid: "183792"
  };
  return jwt.sign(payload, secret, options);
}

function protected(req, res, next) {
  const token = req.headers.authorization;
  console.log("header is: ", req.headers);
  console.log("token is: ", token);

  if (token) {
    jwt.verify(token, secret, (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ error: "invalid token" });
      }
      req.jwtToken = decodedToken;
      console.log("req.jwtToken: ", req.jwtToken);
      next();
    });
  } else {
    return res.status(401).json({ error: "no token provided. " });
  }
}

server.get("/api/users", protected, async (req, res) => {
  console.log("req.jwtToken is: ", req.jwtToken);
  console.log("req.jwtToken.department is: ", req.jwtToken.department);
  const department = req.jwtToken.department;
  try {
    const list = await db("Users").where({ department });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.post("/api/register", async (req, res) => {
  const user = req.body;
  const hash = bcrypt.hashSync(user.password, 14);
  user.password = hash;
  if (!user.username || !user.password) {
    res.status(401).json({ error: "Please enter a username and password" });
  }
  try {
    const ids = await db.insert(user).into("Users");
    try {
      const newUser = await db("Users")
        .where({ id: ids[0] })
        .first();
      // Generate the token
      console.log("user in register is: ", user);
      console.log("newUser in register is: ", newUser);
      const token = generateToken(newUser);

      // attach the token to the response
      res.status(201).json(token);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

server.post("/api/login", async (req, res) => {
  const credentials = req.body;
  const username = credentials.username;
  try {
    const getUser = await db
      .select()
      .from("Users")
      .where({ username })
      .first();
    if (getUser && bcrypt.compareSync(credentials.password, getUser.password)) {
      console.log("getUser in Login is: ", getUser);
      const token = generateToken(getUser);
      res.send(token);
    } else {
      return res.status(401).json({ error: "Incorrect credentials, you shall not pass!" });
    }
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

server.use("/", (req, res) => {
  res.send("server up and running!");
  res.end();
});

server.listen(8000, () => {
  console.log(`\n=== Web API Listening on http://localhost:8000 === \n`);
});
