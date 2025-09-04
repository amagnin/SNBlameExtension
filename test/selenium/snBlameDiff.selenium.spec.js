import {
  Builder,
  Browser,
  promise,
  until,
  By,
  Condition,
} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome.js";

import * as chromedriver from "chromedriver";

import dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import previewRemoteUpdateSet from "./previewUpdateSet.js";
import commitRemoteUpdateSet from "./commitUpdateSet.js";
import deleteGlideAjax from "./deleteMultipleRecords.js";
import removeVersions from "./removeVestinServerSide.js";

dotenv.config();

const PDI_URL = process.env.PDI_URL;
const PDI_USER = process.env.PDI_USER;
const PDI_PASSWORD = process.env.PDI_PASSWORD;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionPath = path.resolve(__dirname, "../../");

/** docs: https://www.selenium.dev/selenium/docs/api/javascript/ **/

const headers = new Headers();
headers.append("Content-Type", "application/json");
headers.append("Accept", "application/json");
headers.append(
  "Authorization",
  "Basic " + Buffer.from(`${PDI_USER}:${PDI_PASSWORD}`).toString("base64")
);

const commitUpdateSet = async (driver, xmlFilePath, sys_id) => {
  driver.findElement(By.css("input[type='file']")).sendKeys(xmlFilePath);
  await driver.findElement(By.css('input[type="submit"].btn')).click();
  await driver.wait(until.titleIs("Retrieved Update Sets | ServiceNow"), 30000);

  await driver.executeScript(
    function (previewRemoteUpdateSetSource, sysID) {
      eval(previewRemoteUpdateSetSource);
      return previewRemoteUpdateSet(sysID);
    },
    previewRemoteUpdateSet.toString(),
    sys_id
  );

  const stateTextLocator = By.id("state_and_percent_text");
  await driver.wait(until.elementLocated(stateTextLocator), 30000);
  await driver.wait(
    until.elementTextContains(
      await driver.findElement(stateTextLocator),
      "Succeeded 100%"
    ),
    10000
  );

  await driver.wait(until.elementLocated(By.id("sysparm_button_close")), 30000);
  (await driver.findElement(By.id("sysparm_button_close"))).click();

  await driver.executeScript(
    function (commitRemoteUpdateSetSource, sys_id) {
      eval(commitRemoteUpdateSetSource);
      return commitRemoteUpdateSet(sys_id);
    },
    commitRemoteUpdateSet.toString(),
    sys_id
  );

  await driver.wait(until.elementLocated(stateTextLocator), 10000);
  await driver.wait(
    until.elementTextContains(
      await driver.findElement(stateTextLocator),
      "Succeeded 100%"
    ),
    10000
  );

  await driver.wait(until.elementLocated(By.id("sysparm_button_close")), 10000);
  (await driver.findElement(By.id("sysparm_button_close"))).click();
};

const getTestAppSysID = async () => {
  const params = new URLSearchParams();
  params.append("sysparm_fields", "sys_id");
  params.append("sysparm_query", "scope=x_blame_ext");

  return (
    await (
      await fetch(`${PDI_URL}/api/now/table/sys_scope?${params.toString()}`, {
        method: "GET",
        headers,
      })
    ).json()
  ).result[0].sys_id;
};

const featchWrapper = async (filter, table) => {

  const params = new URLSearchParams();
  params.append("sysparm_fields", "sys_id");
  params.append("sysparm_query", filter);

  return (await (
    await fetch(`${PDI_URL}/api/now/table/${table}?${params.toString()}`, {
      method: "GET",
      headers,
    })
  ).json())
    .result.map((e) => e.sys_id);
};

const deleteUpdateSets = async (driver, applicationSysID) => {
  let sysUpdateXMLFilter = `update_set.application=${applicationSysID}^ORname=sys_app_${applicationSysID}^remote_update_set=NULL`;
  let updateSetSysFilter = `nameSTARTSWITHDefault^ORnameSTARTSWITHSN Blame Extension^state=ignore^application=${applicationSysID}`;

  let [sysUpdateXMLIDs, updateSetSysIDs] = await Promise.all([
    featchWrapper(sysUpdateXMLFilter,"sys_update_xml"),
    featchWrapper(updateSetSysFilter, "sys_update_set"),
  ]);

  await driver.executeScript(
    function (fnSource, fnSourc2, ids, ids2) {
      eval(fnSource);
      eval(fnSourc2);

      deleteUpdateSetEntry(ids);
      deleteMultipleRecord(ids2, 'sys_update_set');

    },
    deleteGlideAjax.deleteUpdateSetEntry.toString(),
    deleteGlideAjax.deleteMultipleRecord.toString(),
    sysUpdateXMLIDs.toString(),
    updateSetSysIDs.toString()
  );
};

const deleteVersions = async(applicationSysID) => {
   let response = await fetch(`${PDI_URL}/api/now/table/${table}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: 'Removing SN BLAME versions',
        script: `${removeVersions.toString()};removeVersions();`,
        trigger_type: '0',
        system_id : 'ALL NODES',
        state: '0',
        next_action: '01/01/1970 00:00:00'
      })
    })

    return await response.json();
}

const UPDATE_SET_MAP = [
  {
    path: `${extensionPath}/test/testData/SB Blame Application.xml`,
    retrieved_sys_id: "62683981c373ea106b28bb459901311f",
  },
];

describe("Selenium with Jasmine", function () {
  let driver;
  let extensionId;

  beforeAll(async function () {
    promise.USE_PROMISE_MANAGER = false;

    const options = new chrome.Options();
    options.addArguments(
      "--disable-features=DisableLoadExtensionCommandLineSwitch"
    );
    options.addArguments(`--load-extension=${extensionPath}`);
    options.addArguments("--start-maximized");
    options.addArguments("--log-level=3")

    driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build();

    await driver.get("chrome://extensions/");

    extensionId = await driver.executeScript(function () {
      let extensionManager =
        document.querySelector("extensions-manager").shadowRoot;
      let estensionsList = extensionManager.querySelector(
        "extensions-item-list"
      ).shadowRoot;
      return estensionsList.querySelector("extensions-item").getAttribute("id");
    });

    await driver.get(
      `${PDI_URL}/login.do?user_name=${PDI_USER}&user_password=${encodeURIComponent(PDI_PASSWORD)}&sys_action=sysverb_login`
    );

    await driver.get(
      `${PDI_URL}/upload.do?sysparm_referring_url=sys_remote_update_set_list.do&sysparm_target=sys_remote_update_set`
    );

    for (let index = 0; index < UPDATE_SET_MAP.length; index++) {
      let updateSet = UPDATE_SET_MAP[index];
      await commitUpdateSet(driver, updateSet.path, updateSet.retrieved_sys_id);
    }

    /** TODO: 
     * it looks like selenium is not waiting for the click script to finish and we get a stale element error, 
     * this solves it for now: await driver.getTitle()
     * 
     **/
    await driver.getTitle()
  }, 100000);

  afterAll(async function () { 
    let applicationSysID = await getTestAppSysID();
    await driver.get(`${PDI_URL}/sys_scope?sys_id=${applicationSysID}`);

    try {
      await driver.findElement(By.css(".outputmsg_nav a[onclick]")).click();
    } catch (e) {
      console.log("Correct Scope no change needed");
    }

    await driver.wait(until.elementLocated(By.css('[data-action-name="sysverb_delete"]')), 10000);
    (await driver.findElement(By.css('[data-action-name="sysverb_delete"]'))).click();

    await driver.wait(until.elementLocated(By.css('#ok_button[data-dismiss="modal"]')),10000);
    (await driver.findElement(By.css('#ok_button[data-dismiss="modal"]'))).click();

    await driver.wait(until.alertIsPresent());
    let alert = await driver.switchTo().alert();
    await alert.sendKeys("delete");
    await alert.accept();

    await driver.wait(until.elementLocated(By.css("#buttonsPanel>button")));

    //delete all xml related to the app
    await deleteUpdateSets(driver, applicationSysID);
    let sysTriggerID = await deleteVersions(applicationSysID);
    console.log(sysTriggerID);
    await driver.quit();
  }, 100000);

  it("extension is loaded correctly", async function () {
    await driver.get(
      `chrome-extension://${extensionId}/popup/dist/sn-blame.html`
    );

    let options = await driver.executeScript(function () {
      return Array.from(document.body.querySelectorAll("input")).map(
        (e) => e.id
      );
    });

    let buttons = await driver.executeScript(function () {
      return Array.from(document.body.querySelectorAll("button")).map(
        (e) => e.id
      );
    });

    let version = await driver.executeScript(function () {
      return document.body
        .querySelector(".sn-blame-version")
        .innerText.match(/Version\s(\d+\.)?(\d+\.)?(\*|\d+)/i)[0];
    });

    let manifest = JSON.parse(
      fs.readFileSync(`${extensionPath}/manifest.json`, "utf8")
    );

    expect(options.length).toBe(6);
    expect(buttons.length).toBe(2);
    expect(version).toBe(`Version ${manifest.version}`);
  }, 100000);

  it("SN blame diff & Options", async function () {
    
    await driver.get(
      "https://dev204679.service-now.com/sp_widget.do?sys_id=442c0d8593bd0e103f57b1a47aba10f0"
    );

    await driver.wait(until.titleIs("Data Table v2 | Widget | ServiceNow"),100000);

    const title = await driver.getTitle();
    expect(title).toBe("Data Table v2 | Widget | ServiceNow");

    driver.executeScript(function () {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-line-numbers"));
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-gutter-date"));
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-whitespace"));
        window.dispatchEvent(
          new CustomEvent("sn-blame-toggle-user-update-set")
        );
      }, 1000);
    });

    expect(title).toBe("Data Table v2 | Widget | ServiceNow");
  }, 100000);
});
