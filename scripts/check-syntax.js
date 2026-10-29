const fs=require('fs'),path=require('path'),vm=require('vm');
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='node_modules')walk(full);}else if(full.endsWith('.js')){
   new vm.Script(fs.readFileSync(full,'utf8'),{filename:full});console.log('OK',path.relative(process.cwd(),full));
 }
}}
walk(path.resolve('.'));
