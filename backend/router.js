import { Router } from 'express'
// import { body } from 'express-validator'
import { uploadFiles, getFiles, getTest } from './main.js'

const router = Router()


router.get('/', getTest)
router.post('/', uploadFiles)
router.post('/processing', getFiles) // Ожидать обработку файлов


export default router