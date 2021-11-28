require("dotenv").config();
const fs = require("fs");
const _ = require("lodash");
const jwt_decode = require("jwt-decode");
const CronJob = require("cron").CronJob;
const clc = require("cli-color");
const moment = require("moment");
const { ACCOUNTS, BEANS_WHITELIST, PLANETS, APP_ID } = require("./const");
const { retry, sleep } = require("./helpers");
const {
  login,
  getBeans,
  getRequestsMine,
  mine,
  claim,
  getOwnBeans,
  getCharacters,
  getRemainStaminaChar,
  getRemainReward,
  combat,
  eatBean,
} = require("./services");

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
  try {
    const data = await retry(
      getRequestsMine.bind(this, { planet, beanId, token })
    );

    if (data && data.status === "COMPLETED") {
      await retry(mine.bind(this, { planet, beanId, token }));
    } else if (data && moment(data.lockedTo).isBefore(moment())) {
      await retry(claim.bind(this, { planet, beanId, token }));
      await retry(mine.bind(this, { planet, beanId, token }));
    }
  } catch (err) {
    throw err;
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
    if (err && err.statusCode === 401) {
      setup();
    }
    console.log(err);
  }
}

async function eatBeans({ planet, charId, token }) {
  try {
    const beansInfo = await retry(getOwnBeans.bind(this, { planet, token }));
    let minimumBean = beansInfo.pop();

    while (minimumBean.quantity <= 0) {
      minimumBean = beansInfo.pop();
    }

    let remainStamina = await retry(
      getRemainStaminaChar.bind(this, {
        planet,
        charId,
        token,
      })
    );

    while (remainStamina < 180) {
      console.log(clc.blue(`========> START Sleep 2s`));
      await sleep(2000);
      console.log(clc.blue(`========> END Sleep 2s`));

      await retry(
        eatBean.bind(this, {
          planet,
          charId,
          beanId: _.get(minimumBean, "id"),
          token,
        })
      );

      remainStamina = await retry(
        getRemainStaminaChar.bind(this, {
          planet,
          charId,
          token,
        })
      );
    }
  } catch (err) {
    throw err;
  }
}

async function battle({ planet, charId, rare, token }) {
  try {
    let remainReward = await retry(
      getRemainReward.bind(this, {
        planet,
        charId,
        token,
      })
    );

    while (remainReward > 0) {
      console.log(clc.blue(`========> START Sleep 5s`));
      await sleep(5000);
      console.log(clc.blue(`========> END Sleep 5s`));

      let remainStamina = await retry(
        getRemainStaminaChar.bind(this, {
          planet,
          charId,
          token,
        })
      );

      if (remainStamina < 10) {
        await eatBeans({ planet, charId, token });
      }

      await retry(
        combat.bind(this, {
          planet,
          charId,
          rate: rare < 5 ? 1 : 3,
          token,
        })
      );

      remainReward = await retry(
        getRemainReward.bind(this, {
          planet,
          charId,
          token,
        })
      );
    }
  } catch (err) {
    throw err;
  }
}

async function fight() {
  try {
    for (let planet of PLANETS) {
      console.log(clc.blue(`========> START FIGHT planet: ${planet}`));
      await Promise.all(
        accessTokens.map(async (token) => {
          const characters = await retry(
            getCharacters.bind(this, {
              planet,
              token,
            })
          );

          await Promise.all(
            characters.map(async (char) => {
              await battle({
                planet,
                charId: char.id,
                rare: char.rare,
                token,
              });
            })
          );
        })
      );
      console.log(clc.blue(`========> END FIGHT planet: ${planet}`));
    }
  } catch (err) {
    if (err && err.statusCode === 401) {
      setup();
    }
    console.log(err);
  }
}

async function addBeanLogs(time) {
  try {
    await fs.promises.access(`./beans-history-${APP_ID}.log`);
  } catch (error) {
    let plannet = [];
    await fs.promises.writeFile(
      `./beans-history-${APP_ID}.log`,
      JSON.stringify(plannet)
    );
  }

  try {
    let logs = JSON.parse(
      await fs.promises.readFile(`./beans-history-${APP_ID}.log`, {})
    );

    for (let planet of PLANETS) {
      console.log(clc.blue(`========> START ADD LOG BEAN: ${planet}`));
      await Promise.all(
        accessTokens.map(async (token) => {
          const deToken = jwt_decode(token);

          const data = await getOwnBeans({
            planet,
            token,
          });

          logs.push({
            planet,
            email: deToken?.email,
            time: moment().toDate(),
            data,
          });
        })
      );
      console.log(clc.blue(`========> END ADD LOG BEAN: ${planet}`));
    }

    await fs.promises.writeFile(
      `./beans-history-${APP_ID}.log`,
      JSON.stringify(logs)
    );
  } catch (err) {
    console.log(err);
  }
}

async function main() {
  console.log(clc.green("======== START SETUP ========"));
  await setup();
  console.log(clc.green("======== END SETUP ========"));

  setInterval(async () => {
    const d = new Date();
    console.log("Time run:", d);

    console.log(clc.green("======== START FARM EVERY 5 minutes ========"));
    await farm();
    // await addBeanLogs("5m");
    console.log(clc.green("======== END FARM EVERY 5 minutes ========"));
  }, 5 * 60 * 1000 + 5000);

  new CronJob("0 * * * *", async function () {
    const d = new Date();
    console.log("Time run:", d);

    console.log(clc.green("======== START FIGHT EVERY 1 HOURS ========"));
    await fight();
    console.log(clc.green("======== END FIGHT EVERY 1 HOURS ========"));
  }).start();

  new CronJob("0 */6 * * *", async function () {
    const d = new Date();
    console.log("Time run:", d);

    console.log(
      clc.green("======== START REFRESH DATA EVERY 6 HOURS ========")
    );
    await setup();
    console.log(clc.green("======== END REFRESH DATA EVERY 6 HOURS ========"));
  }).start();

  console.log(`APP_ID: ${APP_ID} is running.....`);
}

main();
