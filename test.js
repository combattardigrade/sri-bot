
const fs = require('fs')
const path = require('path')
const flatten = require('flat')
const ObjectsToCsv = require('objects-to-csv')
var convert = require('xml-js')



const facturas = []
// Read files
let files = fs.readdirSync(path.resolve('downloads'))

for (let file of files) {
    // Read xml file
    const xmlData = fs.readFileSync(path.join('downloads', file), 'utf-8')
    // Convert xml file to js object
    const result = convert.xml2js(xmlData, { compact: true, spaces: 4 })
    const factura = convert.xml2js(result.autorizacion.comprobante._cdata, { compact: true, spaces: 4 })
    // console.log(factura.factura.infoTributaria)
    // break
    // flatten js into different objects to filter unnecessary data
    // let infoTributaria = flatten(factura.factura.infoTributaria)
    // const infoFactura = flatten(factura.factura.infoFactura)
    // const detalles = flatten(factura.factura.detalles)
    // const infoAdicional = flatten(factura.factura.infoAdicional)
    // // combine objects into one object
    // const o1 = Object.assign(infoTributaria, infoFactura)
    // const o2 = Object.assign(o1, detalles)
    // const o3 = Object.assign(o2, infoAdicional)
    // push factura to facturasarray
    facturas.push(flatten(factura))    
}

// create new csv with `facturas`
const csv = new ObjectsToCsv(facturas)
// write csv to disk
csv.toDisk('./test.csv')
