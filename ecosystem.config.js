const MAX_MEMORY_RESTART = "2500M";
const KILL_TIMEOUT = 5000;
const WAIT_READY = true;
const LISTEN_TIMEOUT = 20000;
module.exports = {
  apps: [
    {
      name: "Bean-1",
      script: "index.js",
      env: {
        BEANS_WHITELIST: "LUCKY,FLASH",
        ACCOUNTS:
          "dipperpine01@gmail.com/Aa123456,dipperpine02@gmail.com/Aa123456,dipperpine03@gmail.com/Aa123456,dipperpine04@gmail.com/Aa123456,dipperpine05@gmail.com/Aa123456,dipperpine06@gmail.com/Aa123456,dipperpine07@gmail.com/Aa123456,dipperpine08@gmail.com/Aa123456,dipperpine09@gmail.com/Aa123456,dipperpine10@gmail.com/Aa123456",
        PLANETS: "N",
      },
      kill_timeout: KILL_TIMEOUT,
      wait_ready: WAIT_READY,
      listen_timeout: LISTEN_TIMEOUT,
      max_memory_restart: MAX_MEMORY_RESTART,
    },
    {
      name: "Bean-2",
      script: "index.js",
      env: {
        BEANS_WHITELIST: "LUCKY,FLASH",
        ACCOUNTS: "dangtai380@gmail.com/Aa123456",
        PLANETS: "S",
      },
      kill_timeout: KILL_TIMEOUT,
      wait_ready: WAIT_READY,
      listen_timeout: LISTEN_TIMEOUT,
      max_memory_restart: MAX_MEMORY_RESTART,
    },
  ],
};
