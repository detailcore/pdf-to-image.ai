import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import iconv from 'iconv-lite'
iconv.skipDecodeWarning = true
import pdf2img from 'pdf-img-convert'
import { DIR_ROOT } from '../.env.js'

import { EventEmitter } from 'events'
const emitter = new EventEmitter()
// emitter.setMaxListeners(4)


const isWeb = false // web = true || manga = false -  получаем с фронта
const extOut = 'webp' // выходное расширение картинок


export const getTest = async (req, res) => {
  res.json({ msg: 'ok' })
}


// Только загружаем файлы и проверяем их форматы
export const uploadFiles = async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.')
  }

  let result = []
  const files = req.files.pdfFiles // если один файл, то будет объект, а не массив

  if(Array.isArray(files)) { // массив файлов
    for (const item of files) {
      const name = iconv.decode(String(item.name), 'utf8')
      const pdf = isPdf(item.data)

      if(pdf) { // Запускаем очередь
        emitter.emit('waitConverting', { name, data: item.data })
      }
      result.push({ name, pdf: pdf })
    }

  } else { // Один файл
    const name = iconv.decode(String(files.name), 'utf8')
    const pdf = isPdf(files.data)

    if(pdf) { // Запускаем очередь
      emitter.emit('waitConverting', { name, data: files.data })
    }
    result.push({ name, pdf: pdf })
  }

  res.send(result)
}


// Ожидать обработку файлов и отправить их по очереди на фронт (long polling)
export const getFiles = async (req, res) => {
  let result

  const resHandler = async ({ name, data }) => {
    try {
      result = await resBuff(name, data) // Запуск сжатия
      console.log('result =>', result)
    } catch (error) {
      result = false
    }
    // emitter.removeListener('waitConverting', resHandler)
  }

  emitter.once('waitConverting', resHandler)
  console.log(    'cnt event =>', emitter.listenerCount('waitConverting')  )

  if(result) {
    res.status(200).send(result)
  } else {
    res.status(204).send('No content')
  }

  return
  // setTimeout(() => {
  //   res.status(204).send('No content')
  //   return false
  // }, 4000);
}


/**
 * Получить буфер в необходимом формате
 * @param {String} name Исходное имя файла
 * @param {Buffer} file Буффер в формате .pdf
 * @returns {Uint8Array} В формате extOut
 */
async function resBuff(name, file) {
    const pdfArray = await pdf2img.convert( // сколько страниц, столько и массивов Uint8Array
      file,
      {
        scale: 1,
      }
    ) 

  return await convert2Ext(pdfArray, name, extOut)
}


/**
 * Изменение формата из pdf в extOut
 * @param pdfArray {Array} Массив со значениями в формате Uint8Array
 * @param name {String} Абсолютный путь до папки сохранения
 * @param extOut {String} Расширение без точки, в которой сохраняются новые изображения
 * @returns {Object} {name, page, content}
 */
async function convert2Ext(pdfArray, name, extOut) {
  let Buffer = []
  const sizeArr = pdfArray.length

  for (let idx = 0; idx < sizeArr; idx++) {
    const page = pdfArray[idx] // страница в формате Uint8Array
    const numPage = getNumPage(sizeArr, idx)

    const { data, info } = await getImage2Buffer(page, extOut)

    Buffer.push({
      name,
      page: numPage,
      content: data
    })
  }
  return Buffer
}


/**
 * Возвращает сжатый буфер в формате ext
 * @param {Uint8Array} page 
 * @param {String} ext 
 * @returns {Buffer}
 */
async function getImage2Buffer(page, ext) {
  switch (ext) {
    case 'webp':
      return await sharp(page)
        .webp({ quality: 75, effort: 6, smartSubsample: true, })
        .toBuffer({ resolveWithObject: true })

    case 'png':
      return await sharp(page)
        .png()
        .toBuffer({ resolveWithObject: true })

    case 'jpeg':
      return await sharp(page)
        .jpeg({ quality: 80, smartSubsample: true, })
        .toBuffer({ resolveWithObject: true })
  
    default:
      return await sharp(page)
        .webp({ quality: 70, effort: 6, smartSubsample: true, })
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
  return +numPage
}


/**
 * @param {Buffer} buf 
 * @returns true | false
 */
function isPdf(buf) {
  return (Buffer.isBuffer(buf) && buf.lastIndexOf("%PDF-") === 0 && buf.lastIndexOf("%%EOF") > -1)
}