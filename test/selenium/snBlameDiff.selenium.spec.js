import { Builder, Browser, Capabilities, promise, until, By } from "selenium-webdriver";
import dotenv from "dotenv";
import * as chrome from "selenium-webdriver/chrome.js";

import * as chromedriver from "chromedriver";
import fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const PDI_URL = process.env.PDI_URL;
const PDI_USER = process.env.PDI_USER;
const PDI_PASSWORD = process.env.PDI_PASSWORD;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionPath = path.resolve(__dirname, "../../");

const encodeExt = file => {
  const stream = fs.readFileSync(path.resolve(file));
  return Buffer.from(stream);
};

describe("Selenium with Jasmine", function () {
  let driver;

  beforeAll(async function () {
    promise.USE_PROMISE_MANAGER = false;
    console.log(extensionPath)
    const options = new chrome.Options();
    options.addArguments('--disable-features=DisableLoadExtensionCommandLineSwitch');
    options.addArguments(`--load-extension=${extensionPath}`);

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build()
    });

  afterAll(async function () {
    await driver.quit();
  });https://dev204679.service-now.com/login.do?user_name=https://dev204679.service-now.com&user_password=https://dev204679.service-now.com&sys_action=sysverb_login

  it("should open a webpage", async function () {
    await driver.get(`${PDI_URL}/login.do?user_name=${PDI_USER}&user_password=${PDI_PASSWORD}&sys_action=sysverb_login`);
    const title = await driver.getTitle();
    await driver.wait(until.titleIs('webdriver - Google Search'), 100000)
    expect(title).toBe("Login - Employee Center");
    
  },100000);
});
