import express from "express"
import { accessShareLink, createShareLink, deleteShareLink, getShareLinks } from "../controllers/shareController.js"
import { protect } from "../middleware/auth.js"

const shareRouter = express.Router()

// Public link access (anyone with the link)
shareRouter.get("/access/:token", accessShareLink)

// protect share management endpoints
shareRouter.use(protect)
shareRouter.post("/", createShareLink)
shareRouter.get("/", getShareLinks)
shareRouter.delete("/:id", deleteShareLink)


export default shareRouter