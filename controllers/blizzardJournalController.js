// blizzardController.js

// 1. Import environment variables
import 'dotenv/config'; // or require('dotenv').config() if using CommonJS
const { CLIENT_ID, CLIENT_SECRET } = process.env;

// 2. Key to store boss data in localStorage (export so the main file can reference it if needed)
export const BOSS_DATA_KEY = 'bossData';

// 3. Function to get an access token
async function getAccessToken() {
  const response = await fetch(
    `https://us.battle.net/oauth/token?grant_type=client_credentials`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      },
    }
  );
  const data = await response.json();
  return data.access_token;
}

// 4. Function to fetch raid data
async function fetchRaidData(accessToken) {
  const response = await fetch(
    'https://us.api.blizzard.com/data/wow/journal-expansion/index?namespace=static-us&locale=en_US',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch raid data: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// 5. Primary function: fetch and save boss data
export async function fetchAndSaveBossData() {
  try {
    // Step A: Fetch access token
    const accessToken = await getAccessToken();
    console.log('Access Token:', accessToken);

    // Step B: Fetch raid data
    const raidData = await fetchRaidData(accessToken);
    console.log('Raid Data:', raidData);

    // Step C: Find the current (latest) raid
    const currentRaid = raidData.tiers[raidData.tiers.length - 1];
    if (!currentRaid) {
      throw new Error('No raids found in the raid data.');
    }

    // Step D: Fetch boss data for the current raid
    const bossResponse = await fetch(
      `https://us.api.blizzard.com/data/wow/journal-expansion/${currentRaid.id}?namespace=static-us&locale=en_US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!bossResponse.ok) {
      throw new Error(
        `Failed to fetch boss data: ${bossResponse.status} ${bossResponse.statusText}`
      );
    }
    const bossData = await bossResponse.json();
    console.log('Boss Data:', bossData);

    // Step E: Find the current raid tier (the last item in the raids array)
    const currentRaidTier = bossData.raids[bossData.raids.length - 1];
    if (!currentRaidTier) {
      throw new Error('Current raid tier not found in boss data.');
    }

    // Step F: Fetch boss data for the current raid tier
    const raidTierBossResponse = await fetch(
      `https://us.api.blizzard.com/data/wow/journal-instance/${currentRaidTier.id}?namespace=static-us&locale=en_US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!raidTierBossResponse.ok) {
      throw new Error(
        `Failed to fetch boss data for current raid tier: ${
          raidTierBossResponse.status
        } ${raidTierBossResponse.statusText}`
      );
    }
    const raidTierBossData = await raidTierBossResponse.json();
    console.log('Current Raid Tier Boss Data:', raidTierBossData);

    // Step G: Fetch loot data for each boss
    const bossesWithLoot = await Promise.all(
      raidTierBossData.encounters.map(async (boss) => {
        const lootResponse = await fetch(
          `https://us.api.blizzard.com/data/wow/journal-encounter/${boss.id}?namespace=static-us&locale=en_US`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!lootResponse.ok) {
          console.error(
            `Failed to fetch loot data for boss ${boss.name}: ${lootResponse.status} ${lootResponse.statusText}`
          );
          return {
            ...boss,
            loot: [],
          };
        }

        const lootData = await lootResponse.json();
        return {
          ...boss,
          loot: lootData.items || [],
        };
      })
    );

    console.log('Bosses with Loot:', bossesWithLoot);

    // Step H: Save boss data to localStorage
    localStorage.setItem(BOSS_DATA_KEY, JSON.stringify(bossesWithLoot));
    console.log('Boss data saved to localStorage');
  } catch (error) {
    console.error('Error in fetchAndSaveBossData:', error);
  }
}
