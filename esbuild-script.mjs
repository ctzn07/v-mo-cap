import * as esbuild from 'esbuild'
//const inlineImage = require('esbuild-plugin-inline-image)

//build App bundle
await esbuild.build({
    entryPoints: [
        './src/App/app.jsx', 
        './src/Tracker/tracker.jsx', 
    ], 
    bundle: true, 
    outdir: './dist/', 
    //outbase: './src/', 
    //minify: true, 
    loader: {
        '.png': 'dataurl', 
        '.svg': 'dataurl', 
        '.ttf': 'file', 
    }, 
    jsx: 'automatic', 
    plugins: [], 
    logLevel: 'info'
}).catch((e) => {
    console.log(e)
    process.exit(1)
})