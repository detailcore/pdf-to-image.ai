import app from "./server.js"

// app.listen(PORT, process.env.API_DOMAIN, () => {})
app.listen(process.env.SERVER_PORT, 'localhost', () => {
  console.log('Запущено по адресу:', 'http://localhost' +':' + process.env.SERVER_PORT)
})
