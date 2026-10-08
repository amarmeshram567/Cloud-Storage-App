import express from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"
import { initDB } from "./config/db.js"
import authRouter from "./routes/authRoutes.js"


const app = express()

// cors configuration
const allowOrigins = process.env.ORIGINS.split(",")
app.use(cors({ origin: allowOrigins, credentials: true }))

// middleware
app.use(cookieParser())
app.use(express.json({ limit: "100mb" }))

// root api 
app.get("/", (req, res) => {
    res.send("API IS WORKING")
})

// app api routes
app.use("/api/auth", authRouter)



// error handling middleware
app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || "Something went wrong!" })
})

const port = process.env.PORT || 5000;

// Initialize Db connection ten start server
initDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`)
    })
})

