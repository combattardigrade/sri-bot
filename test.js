
const moment = require('moment')
const path = require('path')
const userConfig = {
    "user": {
        "username": "1722357629001",
        "password": "JUAN1722"
    },
    "startDate": {
        "day": "1",
        "month": "2",
        "year": "2020"
    },
    "endDate": {
        "day": "2",
        "month": "2",
        "year": "2020"
    },
    "URL": "https://srienlinea.sri.gob.ec/sri-en-linea/inicio/NAT"
}

console.log(path.join(__filename, 'downloads'))
console.log(path.resolve('downloads'))