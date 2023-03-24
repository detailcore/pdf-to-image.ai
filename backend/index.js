import fs from 'fs'
import path from 'path'
// import sharp from 'sharp'
import pdf2img from 'pdf-img-convert'
import { DIR_ROOT } from '../.env.js'

console.log(DIR_ROOT)

// const inputFolder = path.resolve('./backend/files/input/')
// const outputFolder = path.resolve('./backend/files/output/')
// const files = fs.readdirSync(inputFolder).filter(i => i.indexOf('.pdf') > 0)
// const filename = files[0]
// const pathFile = path.resolve(inputFolder, filename)
// const { name, ext } = path.parse(filename) // ext = '.pdf'


// console.log('files =>', files)
// console.log('pathFile =>', pathFile)
// console.log('name =>', path.parse(filename))


const isWeb = false // web = true || manga = false -  получаем с фронта
const isCut = false // кривая нарезке
const extOut = 'webp' // выходное расширение картинок


// ;(async function () {
//   console.log(1, 'Start to convert')
  
//   const pdfArray = await pdf2img.convert(pathFile) // сколько страниц, столько и массивов Uint8Array
//   // const chapterFolder = path.resolve(outputFolder + '/' + name)

//   // if(!fs.existsSync(chapterFolder)) fs.mkdirSync(chapterFolder) // создаём папку главы, если её нет

//   console.log(2, "Start saving")

//   // if(pdfArray.length > 16 && isWeb) { // Надо делать склейку страниц
//   // }

//   // if(!isWeb && !isCut) { // не вебка и нет нарезки
//   //   await onlySave(pdfArray, chapterFolder, extOut)
//   // }

// })();


async function mergePages() {}


/**
 * Простое сохранение из pdf в картинки
 * @param pdfArray {Array} Массив со значениями в формате Uint8Array
 * @param chapterFolder {String} Абсолютный путь до папки сохранения
 * @param extOut {String} Расширение без точки, в которой сохраняются новые изображения
 */
async function onlySave(pdfArray, chapterFolder, extOut) {
  for (let idx = 0; idx < pdfArray.length; idx++) {
    const page = pdfArray[idx] // страница в формате Uint8Array

    await sharp(page)
      .webp({ quality: 80, effort: 6, smartSubsample: true, })
      .toFile(chapterFolder +'/'+ idx+1 +'.'+ extOut)

  }
}

