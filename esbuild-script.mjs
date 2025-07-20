import * as esbuild from 'esbuild'
//const inlineImage = require('esbuild-plugin-inline-image)

//build App bundle
await esbuild.build({
    entryPoints: ['./src/App/gui/app.jsx'], 
    bundle: true, 
    outfile: './dist/App.js', 
    //minify: true, 
    //loader: {'.js':'jsx'}, 
    plugins: [], 
    logLevel: 'info'
}).catch((e) => {
    console.log('app esbuild failed')
    console.log(e)
    process.exit(1)
})

//build Tracker bundle
await esbuild.build({
    entryPoints: ['./src/Tracker/gui/tracker.jsx'], 
    bundle: true, 
    outfile: './dist/Tracker.js', 
    //minify: true, 
    //loader: {'.js':'jsx'}, 
    plugins: [], 
    logLevel: 'info'
}).catch((e) => {
    console.log('tracker esbuild failed')
    console.log(e)
    process.exit(1)
})
//todo: add tracker bundling after App
//console.log('esbuild done')