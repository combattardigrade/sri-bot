
const fs = require('fs')
const path = require('path')
const flatten = require('flat')
const ObjectsToCsv = require('objects-to-csv')
var convert = require('xml-js')
const crypto = require('crypto')

const convertFiles = async () => {
    const facturas = []
    // Read files
    let files = fs.readdirSync(path.resolve('downloads'))

    for (let file of files) {
        // Read xml file
        const xmlData = fs.readFileSync(path.join('downloads', file), 'utf-8')
        // Convert xml file to js object
        const result = convert.xml2js(xmlData, { compact: true, spaces: 4 })
        const factura = convert.xml2js(result.autorizacion.comprobante._cdata, { compact: true, spaces: 4 })
        facturas.push(flatten(factura))
    }

    // create new csv with `facturas`
    const csv = new ObjectsToCsv(facturas)
    // write csv to disk
    csv.toDisk(path.join('output', crypto.randomBytes(16).toString('hex') + '.csv'))
}

convertFiles()