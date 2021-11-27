const request = require("request-promise");
const _ = require("lodash");

const BASE_URL = "https://backend-api.cryptodball.io";

module.exports = {
  login: async ({ email, password }) => {
    try {
      const res = await request(`${BASE_URL}/auth/signin/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        json: true,
        body: { email, password },
      });

      if (res && res.data) {
        return res?.data?.accessToken;
      }
    } catch (err) {
      throw err;
    }
  },
  getBeans: async ({ planet, whiteList }) => {
    try {
      const res = await request(`${BASE_URL}/quests/groups/available`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      const allRooms = res.data;

      const allBeans = await Promise.all(
        allRooms.map(async (room) => {
          const response = await request(
            `${BASE_URL}/quests/groups/${room?.id}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "dball-planet": planet,
              },
              json: true,
            }
          );

          return response.data.quests;
        })
      );

      const mapBeans = _.filter(_.flattenDeep(allBeans), (item) =>
        _.some(whiteList, (x) => item.name.includes(x))
      );

      const mapBeanIds = _.map(mapBeans, "id");

      return mapBeanIds;
    } catch (err) {
      throw err;
    }
  },
  getRequestsMine: async ({ planet, beanId, token }) => {
    const res = await request(`${BASE_URL}/quests/mine/${beanId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "dball-planet": planet,
      },
      json: true,
    });

    return res.data[0];
  },
  claim: async ({ planet, beanId, token }) => {
    try {
      const res = await request(`${BASE_URL}/quests/mine/${beanId}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      return res.data;
    } catch (err) {
      throw err;
    }
  },
  mine: async ({ planet, beanId, token }) => {
    try {
      const res = await request(`${BASE_URL}/quests/mine/${beanId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      return res.data;
    } catch (err) {
      throw err;
    }
  },
};
