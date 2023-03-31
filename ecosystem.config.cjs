module.exports = {
  name: 'converter',
  script: './backend/index.js',
  max_memory_restart: '1500M',
  exp_backoff_restart_delay: 10000, // перезапуск с экспоненциальной отсрочкой будет постепенно увеличивать время между перезапусками, уменьшая нагрузку на вашу БД
}