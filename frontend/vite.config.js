import { defineConfig } from "vite";

export default defineConfig({
    build: {
        assetsDir: './',
        outDir: '../dist',
        emptyOurDir: '../dist'
    }
});