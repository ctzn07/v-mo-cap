//App entry script
var args = {}
//parse application arguments into object

//typecasting in javascript...
function typeConvert(value){
    if(value === 'true')return true
    if(value === 'false')return false
    if(Number(value))return Number(value)
    return String(value)
}

for(const arg of process.argv.slice(2)){
    Object.assign(args, {[arg.split('=')[0]]: typeConvert(arg.split('=')[1]) || true})
}

//Dynamic import based on app arguments
function moduleLoader(modulePath){
    console.log(`Loading module: ${modulePath} with arguments: ${JSON.stringify(args)}`)
    import(modulePath).then(module => module.default(args))  
}

(args.worker) ? moduleLoader('./Worker/source.mjs') : moduleLoader('./App/app.mjs')