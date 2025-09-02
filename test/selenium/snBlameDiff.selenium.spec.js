import {Builder, Browser, By, Key, until, promise}  from 'selenium-webdriver';
import path from "path";

const __dirname = path.resolve('./');

describe('Selenium with Jasmine', function() {
    let driver;
    promise.USE_PROMISE_MANAGER = false;

    beforeAll(async function() {

        try {
            driver = await new Builder().forBrowser(Browser.CHROME).build()
       
            await driver.get('https://www.google.com/ncr')
            await driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN)
            await driver.wait(until.titleIs('webdriver - Google Search'), 1000)
        } catch(e){
            console.log(e)
        } 
        });

    afterAll(async function() {
        await driver.quit();
    });

    it('should open a webpage', async function() {

        await driver.get('https://dev204679.service-now.com');
        const title = await driver.getTitle();

        expect(title).toBe('Login - Employee Center');

    });

});