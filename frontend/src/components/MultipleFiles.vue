<template>
  <div class="file-upload">

    <input type="file" name="pdfFiles" ref="input" @change="handleFileUploads" multiple />
    <button @click="addFiles">Добавить файлы</button>

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
  import { ref } from 'vue';

  const files = ref([])
  const input = ref(null)

  const handleFileUploads = (e) => {
    const uploadedFiles = e.target.files
    if(uploadedFiles.length <= 0) return

    for (const file of uploadedFiles) {
      files.value.push(file)
    }
  }

  const addFiles = () => {
    input.value.click()
  }

  const removeFile = (i) => {
    files.value.splice(i, 1)
  }

  const submitFiles = async () => {
    let data = new FormData()
    for (const file of files.value) {
      data.append('pdfFiles', file)
    }

    const res = await fetch(`http://localhost:3001/api/`, {
      method: 'POST',
      redentials: 'include',
      body: data
    })

    await waitConverting() // запускаем ожидание

    // console.log('res =>', await res.json())
  }


  const waitConverting = async () => {
    const res = await fetch(`http://localhost:3001/api/processing`, {
      method: 'GET',
      redentials: 'include'
    })

    if(res.status == 204) return false // No Content
    await waitConverting()

    // const result = await res.json()
    // console.log('waitConverting =>', result)

    // setTimeout(() => {
    //   waitConverting()
    // }, 3000)
  }
</script>
