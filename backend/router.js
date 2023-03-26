import { Router } from 'express'
import { body } from 'express-validator'
// import multer from 'multer'
// const upload = multer()
import { uploadFiles, getFiles, getTest } from './main.js'

const router = Router()


router.get('/', getTest)
router.post('/', uploadFiles)
router.get('/processing', getFiles) // Ожидать обработку файлов

// router.post('/', async (req, res) => {
//   console.log(req.files.pdfFiles)
//   res.send('ok')
// })



export default router