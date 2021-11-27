require("dotenv").config();
const clc = require("cli-color");
const moment = require("moment");
const { ACCOUNTS, BEANS_WHITELIST, PLANETS } = require("./const");
const { retry } = require("./helpers");
const { login, getBeans, getRequestsMine, mine, claim } = require("./services");

let accessTokens = [];
let beanIds = {};

async function setup() {
  try {
    const accounts = ACCOUNTS.split(",");
    const result = await Promise.all(
      accounts.map((x) => {
        const [email, password] = x.split("/");
        return retry(login.bind(this, { email, password }));
      })
    );
    console.log(clc.blue("========> LOGIN DONE"));

    accessTokens = result;

    await Promise.all(
      PLANETS.map(async (planet) => {
        beanIds[planet] = await retry(
          getBeans.bind(this, {
            planet,
            whiteList: BEANS_WHITELIST,
          })
        );
      })
    );

    console.log(clc.blue("========> GET GLOBAL DATA DONE"));
  } catch (err) {
    console.log(err);
  }
}

async function farmBean(planet = "S", beanId, token) {
  const data = await retry(
    getRequestsMine.bind(this, { planet, beanId, token })
  );

  if (data && data.status === "COMPLETED") {
    await retry(mine.bind(this, { planet, beanId, token }));
  } else if (data && moment(data.lockedTo).isBefore(moment())) {
    await retry(claim.bind(this, { planet, beanId, token }));
    await retry(mine.bind(this, { planet, beanId, token }));
  }
}

async function farm() {
  try {
    for (let planet of PLANETS) {
      console.log(clc.blue(`========> START planet: ${planet}`));
      await Promise.all(
        accessTokens.map(async (token) => {
          beanIds[planet].forEach((beanId) => {
            farmBean(planet, beanId, token);
          });
        })
      );
      console.log(clc.blue(`========> END planet: ${planet}`));
    }
  } catch (err) {
    console.log(err);
  }
}

async function main() {
  console.log(clc.green("======== START SETUP ========"));
  await setup();
  console.log(clc.green("======== END SETUP ========"));

  farm();

  setInterval(async () => {
    console.log(clc.green("======== START FARM ========"));
    await farm();
    console.log(clc.green("======== END FARM ========"));
  }, 5 * 60 * 1000 + 5000);

  setInterval(async () => {
    console.log(
      clc.green("======== START REFRESH DATA EVERY 6 HOURS ========")
    );
    await setup();
    console.log(clc.green("======== END REFRESH DATA EVERY 6 HOURS ========"));
  }, 6 * 60 * 60 * 1000);
}

main();
