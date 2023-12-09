import cors from 'cors'
import morgan from 'morgan'
import express from 'express'
import fileUpload from 'express-fileupload'
import router from './router.js'

const app = express()

app.use(morgan('dev')) // Журнал консоли
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
  credentials: true,
  origin: [
    'http://localhost:5173', // Vite + Vue (dev mode)
    'http://localhost:6001',
    // process.env.PROTOCOL + '://' + process.env.API_DOMAIN,
    // process.env.PROTOCOL + '://' + process.env.API_DOMAIN +':' + process.env.PORT,
  ],
}))
app.use(fileUpload())


/**
 * Маршруты
 */
app.use('/api', router)


export default app