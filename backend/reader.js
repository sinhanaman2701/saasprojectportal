const fs = require('fs');
let pdf;
try {
  pdf = require('pdf-parse');
  if (typeof pdf !== 'function') pdf = pdf.default;
} catch (e) {
  console.log("pdf-parse not installed");
  process.exit(1);
}

async function run() {
  try {
    const dataBuffer = fs.readFileSync('/Users/namansinha/projectportal/Kolte Patil Post Sale API Document.pdf');
    const data = await pdf(dataBuffer);
    fs.writeFileSync('/Users/namansinha/projectportal/apidoc.txt', data.text);
    console.log('Success');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
