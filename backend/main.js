import sharp from 'sharp'
import AdmZip from 'adm-zip'
import iconv from 'iconv-lite'; iconv.skipDecodeWarning = true
import pdf2img from 'pdf-img-convert'


// Временный массив для хранения загруженных файлов
let inputFiles = [],
    size = null,
    isArchive = false

// Эти данные могут меняться фронтальной частью при загрузке файлов
let scale = 1,
    isWeb = false,
    extOut = 'webp'; // выходное расширение картинок

// тест доступности сервера
export const getTest = async (req, res) => {
  res.json({ msg: 'ok' })
}


// Только загружаем файлы и проверяем их форматы
export const uploadFiles = (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded')
  }

  let result = []
  const files = req.files.files // если файл один, то будет объект, а не массив
  const params = JSON.parse(req.body.json)

  scale = (params.scale).toFixed(1), // 2.0
  isWeb = Boolean(params.isWeb),
  extOut = String(params.extOut)

  if(Array.isArray(files)) { // массив файлов
    for (const item of files) {
      const name = iconv.decode(String(item.name), 'utf8')
      result.push({ name, data: item.data })
    }

  } else { // Один файл
    const name = iconv.decode(String(files.name), 'utf8')
    result.push({ name, data: files.data })
  }
  
  result = result.filter(i => (isPdf(i.data) === true) || (i.name.split('.').pop() === 'zip')) // только pdf
  res.json({
    msg: 'Файл загружен, выполняется обработка, ожидайте',
    names: result.map(i => i.name)
  })

  inputFiles = result
}


// Ожидать обработку файлов и отправить их по очереди на фронт
export const getFiles = async (req, res) => {
  inputFiles.push({ name: false, data: false }) // для прерывания с кодом 204

  if(inputFiles.length === 0 || inputFiles[0].data === false) {
    res.status(204).send('No content')

  } else {
    const reqName = req.body.name // Имя файла с фронтенда

    for (let index = 0; index < inputFiles.length; index++) {
      const el = inputFiles[index] // элемент массива
      
      if(el.name === reqName) { // Если имена одинаковые, обрабатываем файл
        const data = inputFiles.splice(index, 1) // Массив с 1 объектом: [{ data, name }]
        const ext = reqName.split('.').pop()

        try {
          let result = null

          switch (ext) {
            case 'pdf':
              isArchive = false
              result = await resBuff(data[0]) // работа с .pdf
              break;

            case 'zip':
              isArchive = true
              result = await getFilesBufferFromArchive(data[0]) // работа с архивом
              break;
          }

          res.status(200).send(result)
          
        } catch (e) {
          res.status(500).send('Ошибка сервера при сжатии файла: ' + data[0].name)
        }
      }
    }
  }
}



/**
 * Распоковать архив, сжать картинки и получить буфер картинок
 * @param {String} name Исходное имя файла
 * @param {Buffer} data Буффер в формате .zip
 * @returns {Buffer} Буфер картинок из архива
 */
async function getFilesBufferFromArchive({ name, data }) {
  try {
    let result = [], tmpBuff = []
    const zip = new AdmZip(data)

    for (const zipEntry of zip.getEntries()) {
      if(!zipEntry.isDirectory) {
        tmpBuff.push({ filename: zipEntry.name, data: zip.readFile(zipEntry) })
      }
    }

    result = await convert2Ext(tmpBuff, name, extOut)

    return result

  } catch (e) {
    console.log(`Ошибка распаковки архива. ${e}`);
  }
}


/**
 * Получить буфер в необходимом формате
 * @param {String} name Исходное имя файла
 * @param {Buffer} data Буффер в формате .pdf
 * @returns {Array} Массив объектов типа [{ name, page, content: Buffer },]
 */
async function resBuff({ name, data }) {
  let result = []
  const pdfArray = await pdf2img.convert( // сколько страниц, столько и массивов Uint8Array
    data,
    {
      scale: scale, // коэффициент увеличение выходной картинки
    }
  )

  for (const page of pdfArray) {
    result.push({ filename: false, data: page })
  }
  return await convert2Ext(result, name, extOut)
}


/**
 * Изменение формата из pdf в extOut
 * @param buffArray {Array} Массив со значениями ([{filename:'file'||false, data:buffef||Uint8Array}])
 * @param name {String} Имя входного файла ("filename.pdf")
 * @param extOut {String} Расширение без точки, в котором сохраняются новые изображения
 * @returns {Object} {name, page, content}
 */
async function convert2Ext(buffArray, name, extOut) {
  let Buffer = []
  const sizeArr = buffArray.length
  
  if(isWeb) { // Кривая нарезка страниц (склеить страницы)
    size = await getArrDivideSize(buffArray[0].data) // размер подмассива (делитель)
    let chunks = [] // подмассива с результатом
    for (let i = 0; i <Math.ceil(sizeArr/size); i++){
      chunks[i] = buffArray.slice((i*size), (i*size) + size);
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      const items = chunks[idx] // длинна items = size
      const pageNum = getNumPage(chunks.length, idx)

      const { data, info } = await joinImage(items)

      Buffer.push({
        name,
        page: pageNum,
        content: data
      })
    }
    

  } else { // Нормальная нарезка
    for (let idx = 0; idx < sizeArr; idx++) {
      const page = buffArray[idx] // страница в формате Uint8Array
      const pageNum = getNumPage(sizeArr, idx)
  
      const { data, info } = await getImage2Buffer(page.data, extOut)
  
      Buffer.push({
        name,
        page: pageNum,
        content: data
      })
    }
  }

  return Buffer
}


async function joinImage(items) {
  let tmpObjBuff = null
  const firstPage = await getImage2Buffer(items[0].data, extOut) // {data: Buffer, info: { width: 595, height: 841, size: 39996 }}

  if(items.length > 1) { // Если в массиве больше 1 картинки, необходимо их объединить
    for (let idx = 0; idx < items.length; idx++) {

      if(idx > 0) { // Пропускаем первую страницу, т.к. она исходная (к ней идёт склейка)
        const currPage = await getImage2Buffer(items[idx].data, extOut) // текущая стр.

        tmpObjBuff = await sharp(
          tmpObjBuff ? tmpObjBuff.data : firstPage.data // На 1й итерации берём "firstPage", на следующих "tmpObjBuff"
        )
          .extend({ // создаём пустую область
            bottom: currPage.info.height,
            background: { r: 0, g: 0, b: 0 }
          })
          .composite([{ // заполняем область картинкой input
            input: currPage.data, 
            left: 0,
            top: tmpObjBuff ? tmpObjBuff.info.height : firstPage.info.height
          }])
          .toBuffer({ resolveWithObject: true })
      }
    }

  } else { // Если одна
    tmpObjBuff = firstPage
  }

  return tmpObjBuff
}


/**
 * Возвращает сжатый буфер в формате ext
 * @param {Uint8Array} page Буфер картинки
 * @param {String} ext Расширение выходного буфера
 * @returns {Buffer}
 */
async function getImage2Buffer(page, ext) {
  switch (ext) {
    case 'webp':
      return await sharp(page)
        .webp({ quality: 85, effort: 1, smartSubsample: true, })
        .toBuffer({ resolveWithObject: true })

    case 'png':
      return await sharp(page)
        .png({ compressionLevel: 9, effort: 1, })
        .toBuffer({ resolveWithObject: true })

    case 'jpeg':
      return await sharp(page)
        .jpeg({ quality: 80, })
        .toBuffer({ resolveWithObject: true })
  
    default:
      return await sharp(page)
        .webp({ quality: 75, smartSubsample: true, })
        .toBuffer({ resolveWithObject: true })
  }
}


/**
 * Получить номер страницы
 * @param {Number} num Кол-во страниц
 * @param {Number} index Номер текущей страницы, счёт начинается от нуля
 * @returns 
 */
function getNumPage(num, index) {
  let numPage

  if(num < 99) { // меньше 100 файлов
    numPage = (index+1 < 10) ? '0' + String(index + 1) : index + 1
  }
  if(num >= 99) { // 100 и более файлов
    numPage = (index+1 < 10) ? '00' + String(index + 1) : 
              (index+1 >= 10 && index+1 < 100) ? '0' + String(index + 1) : index + 1
  }
  return String(numPage)
}


/**
 * @param {Buffer} buf 
 * @returns true | false
 */
function isPdf(buf) {
  return (Buffer.isBuffer(buf) && buf.lastIndexOf("%PDF-") === 0 && buf.lastIndexOf("%%EOF") > -1)
}


/**
 * 
 * @param {Buffer} buff 
 * @returns {Number}
 */
async function getArrDivideSize(buff) {
  let size = 30,
      max = (extOut === 'webp') ? 16380 : 16000 // max 16380px for .webp
  const { height } = await sharp(buff).metadata()

  while ((size*height) > max) size--

  size = (extOut === 'webp') ? size-1 : size

  return size
} 