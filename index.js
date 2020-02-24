// Selenium Webdriver
const chrome = require('selenium-webdriver/chrome')
const { Builder, By, Key, until } = require('selenium-webdriver')
var webdriver = require('selenium-webdriver');

const request = require('request-promise-native')
const poll = require('promise-poller').default
const fs = require('fs')
const path = require('path')
const flatten = require('flat')
const ObjectsToCsv = require('objects-to-csv')
var convert = require('xml-js')
const crypto = require('crypto')
const fse = require('fs-extra')
const moment = require('moment')

const config = {
    sitekey: '6Lc6rokUAAAAAJBG2M1ZM1LIgJ85DwbSNNjYoLDk',
    pageurl: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/pages/consultas/menu.jsf',
    apiKey: 'cb678ca06942cb3636f0c6410c1a258b',
    apiSubmitUrl: 'http://2captcha.com/in.php',
    apiRetrieveUrl: 'http://2captcha.com/res.php'
}

const initiateCaptchaRequest = async (apiKey) => {
    const formData = {
        method: 'userrecaptcha',
        googlekey: config.sitekey,
        key: config.apiKey,
        pageurl: config.pageurl,
        json: 1
    }
    console.log(`Submitting solution request for ${config.pageurl}`)
    const response = await request.post(config.apiSubmitUrl, { form: formData })
    console.log(response)
    return JSON.parse(response).request
}

const pollForRequestResults = async (key, id, retries = 30, interval = 1500, delay = 500) => {
    console.log(`Waiting for ${delay} miliseconds...`)
    await sleep(delay)
    return poll({
        taskFn: requestCaptchaResults(key, id),
        interval,
        retries
    })
}

const requestCaptchaResults = (apiKey, requestId) => {
    const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
    return async function () {
        return new Promise(async function (resolve, reject) {
            console.log(`Polling for response...`)
            const rawResponse = await request.get(url)
            const resp = JSON.parse(rawResponse)
            console.log(resp)
            if (resp.status === 0) return reject(resp.request)
            console.log('Response received.')
            resolve(resp.request)
        })
    }
}


const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}


const downloadReports = async (driver, userConfig) => {
    // Initiate captcha request
    console.log('Starting recaptcha solution request...')
    let requestId = await initiateCaptchaRequest(config.apiKey)
    // Go to URL
    await driver.get(userConfig.URL)
    // await sleep(5000)
    // Wait for page to load
    await driver.wait(until.titleContains('SRI'), 15000)

    // Click Login Btn
    await driver.wait(until.elementLocated(By.xpath('//*[@id="sribody"]/sri-root/div/div[1]/sri-topbar/div/ul/li[2]/a')), 15000)
    await driver.findElement(By.xpath('//*[@id="sribody"]/sri-root/div/div[1]/sri-topbar/div/ul/li[2]/a')).click()
    console.log('Go to login page btn clicked...')
    await sleep(2000)

    // Wait for page to load
    await driver.wait(until.titleContains('Login'), 15000)
    // Wait for login form
    await driver.wait(until.elementLocated(By.xpath('//*[@id="usuario"]')), 15000)
    // Write credentials
    await driver.findElement(By.xpath('//*[@id="usuario"]')).sendKeys(userConfig.user.username)
    await driver.findElement(By.xpath('//*[@id="password"]')).sendKeys(userConfig.user.password)
    // Click login btn
    await driver.findElement(By.xpath('//*[@id="kc-login"]')).click()
    console.log('Log in btn clicked')

    await sleep(5000)
    await driver.wait(until.titleContains('SRI en Línea'), 15000)

    // Go to reports page
    // Click sidebar btn
    await driver.wait(until.elementLocated(By.xpath('//*[@id="sri-menu"]')), 15000)
    await driver.findElement(By.xpath('//*[@id="sri-menu"]')).click()
    await sleep(500)

    console.log('Check if `RISE` option exists...')
    let riseFlag = 0
    try {
        // Check if User has `RISE`
        const riseBtn = await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[2]/div[1]/a/span[3]'))
        const riseExists = await riseBtn.getText()

        if (riseExists == 'RISE') {
            console.log('RISE option exists')
            riseFlag = 1
        } else {
            riseFlag = 0
        }
    }
    catch (e) {
        console.log('RISE option does not exist')
        riseFlag = 0
    }
    await sleep(500)

    // Click facturacion en linea btn
    // Check if user has `RISE`
    if (riseFlag == 0) {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[1]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[1]/a')).click()
        await sleep(500)
    } else {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[1]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[1]/a')).click()
        await sleep(500)
    }

    // Click Produccion btn
    // Check if user has `RISE`
    if (riseFlag == 0) {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[3]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[3]/a')).click()
        await sleep(500)
    } else {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[3]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[3]/a')).click()
        await sleep(500)
    }

    // Click Consultas btn
    if (riseFlag == 0) {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[3]/p-panelmenusub/ul/li[2]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[3]/p-panelmenusub/ul/li[2]/a')).click()
        await sleep(500)
    } else {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[3]/p-panelmenusub/ul/li[2]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[3]/p-panelmenusub/ul/li[2]/a')).click()
        await sleep(500)
    }

    // Wait for Consulta de comprobantes page
    await driver.wait(until.titleContains('SISTEMA DE COMPROBANTES'), 15000)
    // Wait for `Comprobantes electronicos recibidos y/o emitidos` link to load
    await driver.wait(until.elementLocated(By.xpath('//*[@id="consultaDocumentoForm:panelPrincipal"]/ul/li[2]/a')), 15000)
    await driver.findElement(By.xpath('//*[@id="consultaDocumentoForm:panelPrincipal"]/ul/li[2]/a')).click()
    await sleep(3000)

    // Wait for Report seach page to load    
    await driver.wait(until.titleContains('SISTEMA DE COMPROBANTES'), 15000)
    // Wait for page element to load
    await driver.wait(until.elementLocated(By.xpath('//*[@id="tituloPagina"]/div/span[1]')), 15000)


    // Loop period
    while ((parseInt(userConfig.startDate.day) != parseInt(userConfig.endDate.day)) || (parseInt(userConfig.startDate.month) != parseInt(userConfig.endDate.month)) || (parseInt(userConfig.startDate.year) != parseInt(userConfig.endDate.year))) {

        if (userConfig.downloadEmitidos == true) {
            // Get recibos emitidos
            console.log('Getting `recibos emitidos...`')

            // Select receipt type = Emitidos
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:cmbProcesos"]/option[1]')).click()
            await sleep(2000)

            // Prepare date string
            let day = (userConfig.startDate.day.toString()).length == 1 ? '0' + userConfig.startDate.day.toString() : userConfig.startDate.day.toString()
            let month = (userConfig.startDate.month.toString()).length == 1 ? '0' + userConfig.startDate.month.toString() : userConfig.startDate.month.toString()
            let date = day + '/' + month + '/' + userConfig.startDate.year.toString()
            // Clear date input
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:calendarFechaDesde_input"]')).clear()
            // Write date
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:calendarFechaDesde_input"]')).sendKeys(date)

            // Wait for Recaptcha solution
            console.log('Waiting for recaptcha solution...')
            let response = await pollForRequestResults(config.apiKey, requestId)
            console.log(response)

            // Inject recaptcha
            console.log('Injecting recaptcha solution...')
            await driver.executeScript(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`)
            await driver.executeScript(`rcBuscar();`)
            await sleep(500)

            // check if last loop
            if (!(parseInt(userConfig.endDate.day) - parseInt(userConfig.startDate.day == 1) && (parseInt(userConfig.startDate.month) == parseInt(userConfig.endDate.month)) && (parseInt(userConfig.startDate.year) == parseInt(userConfig.endDate.year)))) {
                // Initiate captcha request
                console.log('Starting recaptcha solution request...')
                requestId = await initiateCaptchaRequest(config.apiKey)
            }
            await sleep(4000)

            // Download files        
            try {
                // check if file exists
                await driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:0:lnkXml"]'))
                for (let i = 0; i < 50; i++) {
                    await driver.wait(until.elementLocated(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:' + i + ':lnkXml"]')), 2000)
                    await driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:' + i + ':lnkXml"]')).click()
                    await sleep(500)
                }
            }
            catch (e) {
                console.log(e)
                console.log('No files found...')
            }
        }

        if (userConfig.downloadRecibidos == true) {
            // Get recibos recibidos
            console.log('Getting `recibos recibidos...`')

            // Select receipt type = Emitidos
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:cmbProcesos"]/option[2]')).click()
            await sleep(2000)

            // Prepare date string
            let day = (userConfig.startDate.day.toString()).length == 1 ? '0' + userConfig.startDate.day.toString() : userConfig.startDate.day.toString()
            let month = (userConfig.startDate.month.toString()).length == 1 ? '0' + userConfig.startDate.month.toString() : userConfig.startDate.month.toString()
            let date = day + '/' + month + '/' + userConfig.startDate.year.toString()
            // Clear date input
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:calendarFechaDesde_input"]')).clear()
            // Write date
            await driver.findElement(By.xpath('//*[@id="frmPrincipal:calendarFechaDesde_input"]')).sendKeys(date)

            // Wait for Recaptcha solution
            console.log('Waiting for recaptcha solution...')
            response = await pollForRequestResults(config.apiKey, requestId)
            console.log(response)

            // Inject recaptcha
            console.log('Injecting recaptcha solution...')
            await driver.executeScript(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`)
            await driver.executeScript(`rcBuscar();`)
            // check if last loop
            if (!(parseInt(userConfig.endDate.day) - parseInt(userConfig.startDate.day == 1) && (parseInt(userConfig.startDate.month) == parseInt(userConfig.endDate.month)) && (parseInt(userConfig.startDate.year) == parseInt(userConfig.endDate.year)))) {
                // Initiate captcha request
                console.log('Starting recaptcha solution request...')
                requestId = await initiateCaptchaRequest(config.apiKey)
            }
            await sleep(4000)

            // Download files        
            try {
                // check if file exists
                await driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:0:lnkXml"]'))

                for (let i = 0; i < 50; i++) {
                    try {
                        // driver.wait(until.elementLocated(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:' + i + ':lnkXml"]')), 2000)
                        driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos:' + i + ':lnkXml"]')).click()
                        //await sleep(500)
                        console.log(`Downloading file no.${i}`)
                    }
                    catch (e) {
                        console.log('File no.' + i + 'does not exists or failed')
                        break;
                    }
                }
            }
            catch (e) {
                console.log(e)
                console.log('No files found...')
            }
        }


        // Update startDate
        userConfig.startDate.day = parseInt(userConfig.startDate.day) + 1
        if (parseInt(userConfig.startDate.day) > 31 || (parseInt(userConfig.startDate.day) > 28 && parseInt(userConfig.startDate.month) == 2)) {
            userConfig.startDate.day = 1
            userConfig.startDate.month = parseInt(userConfig.startDate.month) + 1
            if (userConfig.startDate.month > 12) {
                userConfig.startDate.month = 1
                userConfig.startDate.year = parseInt(userConfig.startDate.year) + 1
            }
        }

        // Wait before next month
        await sleep(1500)
    }

    // Convert files
    await sleep(20000)
    console.log('Process completed...')
    await sleep(2000)
    await convertFiles()
    console.log('Terminating program...')
    await driver.quit()
}


const downloadMonthly = async (driver, userConfig) => {
    // Initiate captcha request
    console.log('Starting recaptcha solution request...')
    let requestId = await initiateCaptchaRequest(config.apiKey)
    // Go to URL
    await driver.get(userConfig.URL)
    // Wait for page to load
    await driver.wait(until.titleContains('SRI'), 15000)

    // Click Login Btn
    await driver.wait(until.elementLocated(By.xpath('//*[@id="sribody"]/sri-root/div/div[1]/sri-topbar/div/ul/li[2]/a')), 15000)
    await driver.findElement(By.xpath('//*[@id="sribody"]/sri-root/div/div[1]/sri-topbar/div/ul/li[2]/a')).click()
    console.log('Go to login page btn clicked...')
    await sleep(2000)

    // Wait for page to load
    await driver.wait(until.titleContains('Login'), 15000)
    // Wait for login form
    await driver.wait(until.elementLocated(By.xpath('//*[@id="usuario"]')), 15000)
    // Write credentials
    await driver.findElement(By.xpath('//*[@id="usuario"]')).sendKeys(userConfig.user.username)
    await driver.findElement(By.xpath('//*[@id="password"]')).sendKeys(userConfig.user.password)
    // Click login btn
    await driver.findElement(By.xpath('//*[@id="kc-login"]')).click()
    console.log('Log in btn clicked')


    await driver.wait(until.titleContains('SRI en Línea'), 15000)
    await sleep(5000)

    // Go to reports page
    // Click sidebar btn
    console.log('Click menu btn...')
    await driver.wait(until.elementLocated(By.xpath('//*[@id="sri-menu"]')), 15000)
    await driver.findElement(By.xpath('//*[@id="sri-menu"]')).click()
    await sleep(500)

    console.log('Check if `RISE` option exists...')
    let riseFlag = 0
    try {
        // Check if User has `RISE`
        const riseBtn = await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[2]/div[1]/a/span[3]'))
        const riseExists = await riseBtn.getText()

        if (riseExists == 'RISE') {
            console.log('RISE option exists')
            riseFlag = 1
        } else {
            riseFlag = 0
        }
    }
    catch (e) {
        console.log('RISE option does not exist')
        riseFlag = 0
    }
    await sleep(500)

    // Click facturacion en linea btn
    // Check if user has `RISE`
    if (riseFlag == 0) {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[1]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[1]/a')).click()
        await sleep(500)
    } else {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[1]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[1]/a')).click()
        await sleep(500)
    }

    // Click Comprobantes Electronicos Recibidos
    // Check if user has `RISE`
    if (riseFlag == 0) {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[2]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[4]/div[2]/div/p-panelmenusub/ul/li[2]/a')).click()
        await sleep(500)
    } else {
        await driver.wait(until.elementLocated(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[2]/a')), 15000)
        await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[2]/a')).click()
        await sleep(500)
    }


    // Wait for Report page to load    
    await driver.wait(until.titleContains('SISTEMA DE COMPROBANTES'), 15000)
    await driver.wait(until.elementLocated(By.xpath('//*[@id="tituloPagina"]/div/span[1]')), 15000)
    await sleep(2000)

    // Loop period
    while ((parseInt(userConfig.startDate.month) != parseInt(userConfig.endDate.month)) || (parseInt(userConfig.startDate.year) != parseInt(userConfig.endDate.year))) {


        // Select all days => option 1
        await driver.wait(until.elementLocated(By.xpath('//*[@id="frmPrincipal:dia"]/option[1]')), 15000)
        await driver.findElement(By.xpath('//*[@id="frmPrincipal:dia"]/option[1]')).click()

        // Select month
        await driver.wait(until.elementLocated(By.xpath('//*[@id="frmPrincipal:mes"]/option[' + parseInt(userConfig.startDate.month) + ']')), 15000)
        await driver.findElement(By.xpath('//*[@id="frmPrincipal:mes"]/option[' + parseInt(userConfig.startDate.month) + ']')).click()

        // Select year       
        let yearSelector = parseInt(userConfig.startDate.year) == moment().format('Y') ? 1 : moment().format('Y') - parseInt(userConfig.startDate.year) + 1
        await driver.findElement(By.xpath('//*[@id="frmPrincipal:ano"]/option[' + parseInt(yearSelector) + ']')).click()

        // Wait for Recaptcha solution
        console.log('Waiting for recaptcha solution...')
        let response = await pollForRequestResults(config.apiKey, requestId)
        console.log(response)

        // Inject recaptcha
        console.log('Injecting recaptcha solution...')
        await driver.executeScript(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`)
        await driver.executeScript(`rcBuscar();`)


        // check if last loop
        if (!((parseInt(userConfig.endDate.month) - parseInt(userConfig.startDate.month) == 1) && (parseInt(userConfig.startDate.year) == parseInt(userConfig.endDate.year)))) {
            // Initiate captcha request
            console.log('Starting recaptcha solution request...')
            requestId = await initiateCaptchaRequest(config.apiKey)
        }
        await sleep(5000)

        // File counter
        let k = 0
        // Check no. of pages
        try {
            let pages = await driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos_paginator_bottom"]/span[3]')).getText()
            pages = pages.split(' of ')
            pages = pages[1].replace(/\D/g, '')
            console.log(`Total pages ${pages}`)


            // Loop pages
            for (let i = 1; i <= pages; i++) {
                for (let j = 0; j < 50; j++) {
                    try {
                        if (i == pages) {
                            // Count total files in last page                            
                            console.log('Executing download script no.' + k)
                            await driver.executeScript(`mojarra.jsfcljs(document.getElementById('frmPrincipal'),{'frmPrincipal:tablaCompRecibidos:` + k + `:lnkXml':'frmPrincipal:tablaCompRecibidos:` + k + `:lnkXml'},'');return false`)
                            
                            k++
                        } else {
                            console.log('Executing download script no.' + k)
                            driver.executeScript(`mojarra.jsfcljs(document.getElementById('frmPrincipal'),{'frmPrincipal:tablaCompRecibidos:` + k + `:lnkXml':'frmPrincipal:tablaCompRecibidos:` + k + `:lnkXml'},'');return false`)
                            k++
                        }
                    }
                    catch (e) {
                        console.log('Error downloading file no.' + k)
                        break;
                    }
                }

                // Wait for all files to download
                let waitDownloadsFlag = 1
                while (waitDownloadsFlag == 1) {
                    console.log('Waiting for files to download...')
                    let files = fs.readdirSync(path.resolve('downloads'))
                    console.log(`Files downloaded: ${files.length} of ${k - 2}`)
                    if (files.length < (k * 0.95)) {
                        console.log('Waiting for downloads to complete...')
                        await sleep(1000)
                    } else {
                        console.log('Downloads completed...')
                        waitDownloadsFlag = 0
                    }
                }
                waitDownloadsFlag = 1

                // Click next page btn
                if (i != (pages)) {
                    console.log(`Going to page no.${i + 1}`)
                    await driver.findElement(By.xpath('//*[@id="frmPrincipal:tablaCompRecibidos_paginator_bottom"]/span[4]')).click()
                    await sleep(2000)
                }
            }
        }
        catch (e) {
            console.log('No pages found')
        }

        // Update startDate
        userConfig.startDate.month = parseInt(userConfig.startDate.month) + 1
        if (parseInt(userConfig.startDate.month) > 12) {
            userConfig.startDate.month = 1
            userConfig.startDate.year = parseInt(userConfig.startDate.year) + 1
        }

        // Wait before next month
        await sleep(1500)
    }

    // Convert files    
    console.log('Process completed...')
    await convertFiles()
    await sleep(2000)
    console.log('Terminating program...')
    await driver.quit()
}

const convertFiles = async () => {
    console.log('Converting files xml files to csv...')
    const facturas = []
    // Read files
    let files = fs.readdirSync(path.resolve('downloads'))

    for (let file of files) {
        // Check if file is `factura`
        if (!file.includes('Factura')) continue;
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
    await csv.toDisk(path.join('output', crypto.randomBytes(16).toString('hex') + '.csv'))
    console.log('CSV file created...')
}


start = async () => {
    // browser options
    const options = new chrome.Options()
    var logging_prefs = new webdriver.logging.Preferences();
    logging_prefs.setLevel(webdriver.logging.Type.PERFORMANCE, webdriver.logging.Level.ALL);
    options.setLoggingPrefs(logging_prefs);

    // options.addArguments("--incognito")
    // Needed for headless
    options.addArguments("--window-size=1920,1080")
    options.addArguments("--start-maximized")
    // options.addArguments("--headless")
    // use personal profile
    // options.addArguments("--user-data-dir=C:/Users/tardigrade/AppData/Local/Google/Chrome/User Data/");
    //options.addArguments("--profile-directory=Default")

    // Download directory
    //options.addArguments('download.default_directory', path.join(__filename, 'downloads'))

    // Capabilities
    // https://github.com/seleniumhq/selenium/issues/2349#issuecomment-390216266

    // setUserPreferences
    // https://stackoverflow.com/questions/46592946/how-to-set-file-download-directory-using-node-js-selenium-chrome-driver?rq=1

    // Chrome experimental preferences
    // https://stackoverflow.com/questions/46937319/how-to-use-chrome-webdriver-in-selenium-to-download-files-in-python

    options.setUserPreferences({
        'download.default_directory': path.resolve('downloads'),
        'download.prompt_for_download': false,
        "download.directory_upgrade": true,
        "safebrowsing.enabled": true,
        "profile.default_content_setting_values.automatic_downloads": 1 // download multiple files
    })

    // Read Json file
    const userConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'))

    // Empty Downloads folder if set in config
    if (userConfig.emptyDownloadsFolderOnStart == true) {
        fse.emptyDirSync(path.resolve('downloads'))
    }

    // Empty Output folder if set in config
    if (userConfig.emptyOutputFolderOnStart == true) {
        fse.emptyDirSync(path.resolve('output'))
    }

    // start driver
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

    // Tipo de descarga (mensual o diaria)
    if (userConfig.tipoDescarga == 'diaria' || userConfig.tipoDescarga == 'diario') {
        // download reports daily process
        console.log('Starting daily download...')
        await downloadReports(driver, userConfig)
    }
    else if (userConfig.tipoDescarga == 'mensual') {
        // download reports monthly process
        console.log('Starting monthly download...')
        await downloadMonthly(driver, userConfig)
    }

}


start()