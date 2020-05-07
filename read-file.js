const csvjson = require('csvjson');
const readFile = require('fs').readFile;
const fs = require('fs')
const path = require('path');


readFile('./input-data.csv', 'utf-8', (err, fileContent) => {
    if(err) {
        console.log(err); // Do something to handle the error or just throw it
        throw new Error(err);
    }

    const directory = './manualdocs';
    if (!fs.existsSync(directory)){
        fs.mkdirSync(directory);
    }
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
    const jsonObj = csvjson.toObject(fileContent);

    for (let i = 0; i < jsonObj.length; i++){
        try {
            fileName='./manualdocs/' + i +'_manual.json'
            fs.writeFileSync(fileName, JSON.stringify(jsonObj[i]), { mode: 0o755 });
        } catch(err) {
            // An error occurred
            console.error(err);
        }


    }

});

