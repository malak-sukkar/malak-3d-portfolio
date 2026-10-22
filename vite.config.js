import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    base: '/malak-3d-portfolio/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(projectRoot, 'index.html'),
                admin: resolve(projectRoot, 'admin.html'),
            },
        },
    },
})
