//App entry script
var args = {}
//parse application arguments into object
for(const arg of process.argv.slice(2)){
    Object.assign(args, {[arg.split('=')[0]]: arg.split('=')[1] || true})
}

console.log('Startup arguments:', args)

//Dynamic import based on app arguments
function moduleLoader(modulePath){
    import(modulePath).then(module => module.default(args))
}

(args.worker === 'true') ? moduleLoader('./Worker/worker.mjs') : moduleLoader('./App/app.mjs')