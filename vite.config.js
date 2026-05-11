import { defineConfig } from 'vite'

export default defineConfig({
  base: '/inkless/',
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
  },
})
