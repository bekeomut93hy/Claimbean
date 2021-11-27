require("dotenv").config();
const _ = require("lodash");
const CronJob = require("cron").CronJob;
const clc = require("cli-color");
const moment = require("moment");
const { ACCOUNTS, BEANS_WHITELIST, PLANETS } = require("./const");
const { retry, sleep } = require("./helpers");
const {
  login,
  getBeans,
  getRequestsMine,
  mine,
  claim,
  getOwnBean,
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
    console.log(err);
  }
}

async function eatBeans({ planet, charId, token }) {
  try {
    const beansInfo = await retry(getOwnBean.bind(this, { planet, token }));
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
    console.log(err);
  }
}

async function main() {
  console.log(clc.green("======== START SETUP ========"));
  await setup();
  console.log(clc.green("======== END SETUP ========"));

  const farmBeanJob = new CronJob("15 */5 * * * *", async function () {
    const d = new Date();
    console.log("Time run:", d);
    console.log(
      clc.green("======== START FARM EVERY 5 minutes 15 seconds ========")
    );
    await farm();
    console.log(
      clc.green("======== END FARM EVERY 5 minutes 15 seconds ========")
    );
  });

  const fightJob = new CronJob("0 9 * * *", async function () {
    const d = new Date();
    console.log("Time run:", d);
    console.log(
      clc.green("======== START FIGHT AT 09:00 AM every day ========")
    );
    await fight();
    console.log(clc.green("======== END FIGHT AT 09:00 AM every day ========"));
  });

  const refreshDataJob = new CronJob("0 */6 * * *", async function () {
    const d = new Date();
    console.log("Time run:", d);
    console.log(
      clc.green("======== START REFRESH DATA EVERY 6 HOURS ========")
    );
    await setup();
    console.log(clc.green("======== END REFRESH DATA EVERY 6 HOURS ========"));
  });

  farmBeanJob.start();
  fightJob.start();
  refreshDataJob.start();
}

main();
