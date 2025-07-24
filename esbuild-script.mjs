import * as esbuild from 'esbuild'
import fs from 'node:fs'
//const inlineImage = require('esbuild-plugin-inline-image)

//clear /dist folder before build
fs.rmSync('./dist/', {recursive: true, force: true})

//build App bundle
await esbuild.build({
    entryPoints: [
        './src/App/app.jsx', 
        './src/Tracker/tracker.jsx', 
        './src/app.html', 
        './src/tracker.html', 
        './src/css/global.css'
    ], 
    bundle: true, 
    outdir: './dist/', 
    //outbase: 'dist/',
    assetNames: '[name]',   //prevents renaming asset files(html) 
    //chunkNames: '[ext]/[name]', 
     
    //minify: true, 
    loader: {
        '.png': 'dataurl', 
        '.svg': 'dataurl', 
        '.ttf': 'file', 
        '.html': 'file', 
        '.css': 'css'
    }, 
    jsx: 'automatic', 
    plugins: [], 
    logLevel: 'info'
}).catch((e) => {
    console.log(e)
    process.exit(1)
})