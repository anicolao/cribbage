import './start';
const vite=Bun.spawn(['bun','x','vite','--host','127.0.0.1','--port','5197','--strictPort'],{stdout:'inherit',stderr:'inherit'});
process.on('exit',()=>vite.kill());
const code=await vite.exited;process.exit(code);
