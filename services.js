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
  getOwnBean: async ({ planet, whiteList, token }) => {
    try {
      const itemResults = await request(`${BASE_URL}/items/mine`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      const items = itemResults?.data;
      const itemsExtraDataResults = await request(`${BASE_URL}/items/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
        body: {
          ids: items.map((i) => i.itemId),
        },
      });

      const extraDataItems = itemsExtraDataResults?.data.map((x) => ({
        itemId: x?.id,
        stamina: x?.stamina,
        staminaFrom: x.staminaFrom,
        staminaTo: x?.staminaTo,
        code: x?.code,
        name: x?.name,
        status: x?.status,
        imge: x?.image,
        type: x?.type,
      }));

      const mergeBean = _.orderBy(
        _.filter(
          items
            .map((item) => {
              const findItem = extraDataItems.find(
                (x) => x.itemId === item.itemId
              );
              return {
                id: item.id,
                stamina: findItem?.stamina || 15,
                quantity: item.quantity,
                staminaFrom: findItem?.staminaFrom,
              };
            })
            .filter((x) => !(x?.staminaFrom < 0)),
          (_x) => _x.quantity
        ),
        ["stamina"],
        ["desc"]
      );

      return mergeBean;
    } catch (err) {
      console.log(err);
    }
  },
  getCharacters: async ({ planet, token }) => {
    try {
      const res = await request(`${BASE_URL}/nfts/mine`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      if (res && res.data && res.data.length) {
        return res.data.filter((char) => char.hatched);
      }

      return [];
    } catch (err) {
      throw err;
    }
  },
  getRemainStaminaChar: async ({ planet, charId, token }) => {
    try {
      const res = await request(`${BASE_URL}/nfts/${charId}/stamina`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      const { stamina } = res.data;

      return stamina;
    } catch (err) {
      throw err;
    }
  },
  getRemainReward: async ({ planet, charId, token }) => {
    try {
      const res = await request(`${BASE_URL}/nfts/${charId}/reward`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
      });

      if (res && res.data) {
        let amount = Number(res.data.amount) / 1000000000000000000;
        let maxAmount = Number(res.data.maxAmount) / 1000000000000000000;

        return maxAmount - amount;
      }

      return 0;
    } catch (err) {
      throw err;
    }
  },
  eatBean: async ({ planet, charId, beanId, token }) => {
    try {
      const res = await request(`${BASE_URL}/items/mine/usages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
        body: {
          nftId: charId,
          userItemId: beanId,
          quantity: 1,
        },
      });

      const newStamina = res?.data.newStamina;

      return newStamina;
    } catch (err) {
      throw err;
    }
  },
  combat: async ({ planet, charId, rate, token }) => {
    try {
      const res = await request(`${BASE_URL}/battles/combat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "dball-planet": planet,
        },
        json: true,
        body: {
          nftId: charId,
          rate,
        },
      });

      let result = "LOSE";
      if (res && res.data) {
        result = res.data.result;
      }
      return result;
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
