const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running At http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.post('/register/', async (request, response) => {
  try {
    const {username, password, name, gender} = request.body
    const hashedPassword = await bcrypt.hash(request.body.password, 10)
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
    const dbUser = await db.get(selectUserQuery)
    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO 
        user (username, password, name, gender) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}', 
          '${name}',
          '${gender}'
          
        );`
      if (password.length < 6) {
        response.status(400)
        response.send('Password is too short')
      } else {
        await db.run(createUserQuery)
        response.send('User created successfully')
      }
    } else {
      response.status(400)
      response.send('User already exists')
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('invalid password')
    }
  }
})

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['Authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//API 3

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {offset = 0, limit = 4, order = 'ASC'} = request.query

  const getLatestTweets = `
    SELECT
      *
    FROM
     tweet
    WHERE
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset};`

  const tweets = await get.all(getLatestTweets)
  response.send(tweets)
})

module.exports = app
