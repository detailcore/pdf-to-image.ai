<template>
  <div class="file-upload">

    <input type="file" name="files" ref="inputPdf" @change="handleFileUploads" accept="application/pdf" multiple />
    <input type="file" name="files" ref="inputArch" @change="handleFileUploads" accept=".zip" multiple />
    
    <div class="title">Из .pdf в архив с картинками</div>
    <button @click="addPdfFiles" class="add">Добавить файлы (.pdf)</button>
    
    <div class="separator"></div>

    <div class="title">Из архива в архив (сжать и склеить)</div>
    <button @click="addArchFiles" class="add">Добавить файлы (.zip)</button>
    <!-- <div class="subtitle red">не больше 3х файлов за раз</div> -->

    <div class="separator"></div>

    <div class="output">
      <div class="title">Выходные параметры</div>
      <div class="params">
        <div class="param">
          <div class="subtitle">1. Нарезка:</div>
          <input type="checkbox" id="checkbox" v-model="isWeb" />
          <label for="checkbox">кривая (много страниц)</label>
        </div>

        <div class="param">
          <div class="subtitle">2. Коэффициент увеличение для .pdf (от 0.5 до 2):</div>
          <input type="number" v-model="scale" />
        </div>

        <div class="param">
          <div class="subtitle">3. Расширение:</div>
          <div class="radio">
            <input type="radio" id="webp" value="webp" v-model="extOut" />
            <label for="webp">.webp</label>
            <input type="radio" id="png" value="png" v-model="extOut" />
            <label for="png">.png</label>
            <input type="radio" id="jpeg" value="jpeg" v-model="extOut" />
            <label for="jpeg">.jpeg</label>
          </div>
        </div>

      </div>
    </div>

    <div class="list">
      <div class="title">Список файлов</div>
      <div class="item" v-for="(item, index) in files" :key="index">
        <span class="remove" @click="removeFile(index)">[X]</span>
        {{ item.name }}
      </div>
    </div>

    <button v-if="files.length > 0" @click="submitFiles">Загрузить файл(ы)</button>
  </div>
</template>


<script setup>
  import { ref } from 'vue'
  import JSZip from 'jszip'
  import { saveAs } from 'file-saver'
  import { PORT } from '../../../.env.js'

  const files = ref([])
  const inputPdf = ref(null)
  const inputArch = ref(null)
  const extOut = ref('jpeg')
  const scale = ref(1)
  const isWeb = ref(true)

  const isPdf = (name) => {
    return name.split('.').pop() === 'pdf'
  }

  const isArch = (name) => {
    return name.split('.').pop() === 'zip'
  }

  const handleFileUploads = (e) => {
    const uploadedFiles = e.target.files
    if(uploadedFiles.length <= 0) return

    for (const file of uploadedFiles) {
      if(isPdf(file.name)) files.value.push(file)
      if(isArch(file.name)) files.value.push(file)
    }
  }

  const addPdfFiles = () => { inputPdf.value.click() }
  const addArchFiles = () => { inputArch.value.click() }

  const removeFile = (i) => {
    files.value.splice(i, 1)
  }

  const submitFiles = async () => {
    for (const file of files.value) {
      let data = new FormData()
      data.append('files', file)
      data.append('json', JSON.stringify({ extOut: extOut.value, scale: scale.value, isWeb: +isWeb.value }))

      const res = await fetch(`http://localhost:${PORT}/api/`, {
        method: 'POST',
        credentials: 'include',
        body: data,
      })

      if(res.status !== 200) return false
      const { names, msg } = await res.json()

      if(names.length > 0) {
        for (const name of names) {
          await waitConverting(name) // запускаем канал ожидание 
        }
      }
    }
  }


  const waitConverting = async (name) => {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/processing`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({ name: name })
      })

      if(res.status == 204) return false // No Content, прерываем функцию

      if(res.status === 200) { // Создаём архив с файлами
        let zip = new JSZip()
        const result = await res.json() // Массив объектов: [{name: String, page: Number, content: {type, data},]

        for (const item of result) {
          zip.file(item.page +'.'+ extOut.value, item.content.data) // Добавляем в архив страницы          
        }
        zip.generateAsync({type:"blob"}).then(function (content) {
          saveAs(content, (result[0].name).replace('.pdf', '').replace('.zip', '') + '.zip')
        }, function (err) {
          console.log('ERROR =>', err)
        })
      }

    } catch (error) {
      console.log('ERR =>', error)
      return false
    }
  }
</script>
