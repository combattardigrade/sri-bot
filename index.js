// Selenium Webdriver
const chrome = require('selenium-webdriver/chrome')
const { Builder, By, Key, until } = require('selenium-webdriver')
const request = require('request-promise-native')
const poll = require('promise-poller').default
const fs = require('fs')
const moment = require('moment')

const URL = 'https://srienlinea.sri.gob.ec/sri-en-linea/inicio/NAT'

const config = {
    sitekey: '6Lc6rokUAAAAAJBG2M1ZM1LIgJ85DwbSNNjYoLDk',
    pageurl: 'https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/pages/consultas/recibidos/comprobantesRecibidos.jsf?&contextoMPT=https://srienlinea.sri.gob.ec/tuportal-internet&pathMPT=Facturaci%F3n%20Electr%F3nica&actualMPT=Comprobantes%20electr%F3nicos%20recibidos%20&linkMPT=%2Fcomprobantes-electronicos-internet%2Fpages%2Fconsultas%2Frecibidos%2FcomprobantesRecibidos.jsf%3F&esFavorito=S',
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

const pollForRequestResults = async (key, id, retries = 30, interval = 1500, delay = 15000) => {
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


const login = async (driver, userConfig) => {
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

    await sleep(5000)
    await driver.wait(until.titleContains('SRI en Línea'), 15000)

    // Go to reports page
    // Click sidebar btn
    await driver.wait(until.elementLocated(By.xpath('//*[@id="sri-menu"]')), 15000)
    await driver.findElement(By.xpath('//*[@id="sri-menu"]')).click()
    await sleep(1500)
    await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[1]/a')).click()
    await sleep(500)
    await driver.findElement(By.xpath('//*[@id="mySidebar"]/p-panelmenu/div/div[5]/div[2]/div/p-panelmenusub/ul/li[2]/a')).click()

    // Wait for Report page to load    
    await driver.wait(until.titleContains('SISTEMA DE COMPROBANTES'), 15000)
    await sleep(3000)



    // Loop period
    while ((userConfig.startDate.month != userConfig.endDate.month) && (userConfig.startDate.year != userConfig.endDate.year)) {

        // Initiate captcha request
        console.log('Starting recaptcha solution request...')
        const requestId = await initiateCaptchaRequest(config.apiKey)

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
        const response = await pollForRequestResults(config.apiKey, requestId)
        console.log(response)

        // Inject recaptcha
        console.log('Injecting recaptcha solution...')
        await driver.executeScript(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`)
        await driver.executeScript(`rcBuscar();`)
        await sleep(500)

        // Download files
        



        // Update startDate
        userConfig.startDate.month = parseInt(userConfig.startDate.month) + 1
        if (userConfig.startDate.month > 12) {
            userConfig.startDate.month = 1
            userConfig.startDate.year = parseInt(userConfig.startDate.year) + 1
        }

        // Wait before next month
        await sleep(1500)

    }

    console.log('Done...')
    await sleep(20000)
}

start = async () => {
    // browser options
    const options = new chrome.Options()
    // options.addArguments("--incognito")
    options.addArguments("--start-maximized")
    // use personal profile
    // options.addArguments("--user-data-dir=C:/Users/tardigrade/AppData/Local/Google/Chrome/User Data/");
    //options.addArguments("--profile-directory=Default")

    // Read Json file
    const userConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'))

    // start driver
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

    // login process
    await login(driver, userConfig)

}


start()