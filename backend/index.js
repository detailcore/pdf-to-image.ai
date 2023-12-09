import app from "./server.js"


// app.listen(3001, process.env.API_DOMAIN, () => {})
app.listen(6001, 'localhost', () => {
  console.log('Запущено по адресу:', 'http://localhost' +':' + 6001)
})
