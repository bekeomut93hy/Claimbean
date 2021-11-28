module.exports = {
  ACCOUNTS: process.env.ACCOUNTS || "",
  BEANS_WHITELIST: process.env.BEANS_WHITELIST
    ? process.env.BEANS_WHITELIST.split(",")
    : ["LUCKY", "FLASH"],
  PLANETS: process.env.PLANETS ? process.env.PLANETS.split(",") : ["S", "N"],
  APP_ID: process.env.APP_ID || "1",
};
