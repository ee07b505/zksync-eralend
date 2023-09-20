import puppeteer from "puppeteer";
import axios from "axios";

const sleep = async (seconds) =>
  new Promise((resolve) =>
    setTimeout(() => {
      // @ts-ignore
      resolve();
    }, seconds * 1000)
  );

const getPropByStringPath = (obj, path) => {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    // Check if the current part is an array index
    const arrayMatch = parts[i].match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      if (
        Array.isArray(current[arrayName]) &&
        index < current[arrayName].length
      ) {
        current = current[arrayName][index];
      } else {
        return undefined;
      }
    } else {
      current = current[parts[i]];
    }
  }

  return current;
};

async function getTwitterUserInfo(username) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const browserProcess = browser.process();
  try {
    const page = await browser.newPage();
    let userInfo;

    let fetching = true;
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      if (["image", "media"].includes(request.resourceType())) {
        // 如果是图像或媒体请求，就拦截
        request.abort();
      } else {
        request.continue();
      }
    });
    // 监听网络响应
    page.on("response", async (response) => {
      if (response.url().includes("UserByScreenName")) {
        try {
          const data = await response.json();
          userInfo = getPropByStringPath(data, "data.user.result.legacy");
          fetching = false;
        } catch (error) {
          fetching = false;
        }
      }
    });
    await page.goto(`https://mobile.twitter.com/${username}`);
    let sleepTime = 0;
    while (fetching && sleepTime < 20) {
      sleepTime += 0.1;
      await sleep(0.1);
    }

    await browser.close();
    // if (browserProcess?.pid) {
    //   process.kill(browserProcess.pid);
    // }
    if (userInfo) {
      return userInfo;
    }
    return {};
  } catch (error) {
    console.log("getTwitterUserInfo failed", error.message);
    if (browserProcess?.pid) {
      process.kill(browserProcess.pid);
    }
    if (browser) {
      await browser.close();
      return {};
    }
  }
}