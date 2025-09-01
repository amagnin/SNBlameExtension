import fs from 'fs';
import archiver from 'archiver';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const output = fs.createWriteStream(__dirname + '/SN Blame.zip');
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.pipe(output);

archive.append(fs.createReadStream(`${__dirname}/manifest.json`), { name: 'manifest.json' })
archive.append(fs.createReadStream(`${__dirname}/LICENSE`), { name: 'LICENSE.md' })
archive.append(fs.createReadStream(`${__dirname}/PRIVACY.md`), { name: 'PRIVACY.md' })
archive.append(fs.createReadStream(`${__dirname}/README.md`), { name: 'README.md' })
archive.append(fs.createReadStream(`${__dirname}/image.png`), { name: 'image.png' })

archive.directory('popup/dist', 'popup/dist');
archive.directory('scripts/dist', 'scripts/dist');
archive.directory('styles/dist', 'styles/dist');
archive.directory('images', 'images');

archive.finalize();
