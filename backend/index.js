import app from "./server.js"
import { PORT } from "../.env.js"


// app.listen(PORT, process.env.API_DOMAIN, () => {})
app.listen(PORT, 'localhost', () => {
  console.log('Запущено по адресу:', 'http://localhost' +':' + PORT)
})
