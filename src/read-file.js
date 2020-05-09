const readFile = require('fs').readFile;
const fs = require('fs')
const path = require('path');

var csv = require("csvtojson");

convert_csv_json();

function convert_csv_json() {
	input_file1 = './data/discovery-nlu/output/HighSchoolClasses_Analyzed.csv';
	input_file2 = './data/discovery-nlu/output/ElementarySchoolClasses_Analyzed.csv';
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
	
	csv()
	.fromFile(input_file1)
	.then((jsonObj1)=>{
	    for (let i = 0; i < jsonObj1.length; i++){
	        try {
	            fileName='./manualdocs/' + i +'_high.json'
	            fs.writeFileSync(fileName, JSON.stringify(jsonObj1[i]), { mode: 0o755 });
	        } catch(err) {
	            // An error occurred
	            console.error(err);
	        }
		}
		csv()
		.fromFile(input_file2)
		.then((jsonObj2)=>{
		    for (let j = jsonObj1.length; j < jsonObj2.length; j++){
		        try {
		            fileName='./manualdocs/' + j +'_elementary.json'
		            fs.writeFileSync(fileName, JSON.stringify(jsonObj2[j]), { mode: 0o755 });
		        } catch(err) {
		            // An error occurred
		            console.error(err);
		        }
			}
		})
	});	
}

