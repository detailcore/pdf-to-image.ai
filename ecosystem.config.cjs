module.exports = {
  name: 'pdf-2-img',
  script: './backend/index.js',
  exec_mode: 'cluster',
  instances: 2,
  max_memory_restart: '1500M',
  exp_backoff_restart_delay: 10000, // перезапуск с экспоненциальной отсрочкой будет постепенно увеличивать время между перезапусками, уменьшая нагрузку на вашу БД
}