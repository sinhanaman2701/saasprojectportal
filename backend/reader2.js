const { PdfReader } = require("pdfreader");

let text = "";
new PdfReader().parseFileItems("/Users/namansinha/projectportal/Kolte Patil Post Sale API Document.pdf", (err, item) => {
  if (err) console.error("error:", err);
  else if (!item) {
    const fs = require('fs');
    fs.writeFileSync('/Users/namansinha/projectportal/apidoc.txt', text);
    console.log("Success");
  }
  else if (item.text) {
    text += item.text + "\n";
  }
});
