
const moment = require('moment')


const userConfig = {
    "user": {
        "username": "1722357629001",
        "password": "JUAN1722"
    },
    "startDate": {
        "month": "10",
        "year": "2019"
    },
    "endDate": {
        "month": "2",
        "year": "2020"
    },
    "URL": "https://srienlinea.sri.gob.ec/sri-en-linea/inicio/NAT"
}

const year = 2020
let yearSelector = parseInt(userConfig.startDate.year) == parseInt(moment().format('Y')) ? 1 : parseInt(moment().format('Y')) - parseInt(userConfig.startDate.year) + 1

userConfig.startDate.month = parseInt(userConfig.startDate.month) + 1

console.log(userConfig.startDate.month)
