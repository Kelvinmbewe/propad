export interface SuburbSeed {
  name: string;
  lat?: number;
  lng?: number;
  polygonGeoJson?: Record<string, unknown> | null;
}

export interface CitySeed {
  name: string;
  lat?: number;
  lng?: number;
  suburbs?: SuburbSeed[];
}

export interface ProvinceSeed {
  name: string;
  cities: CitySeed[];
}

export interface CountrySeed {
  iso2: string;
  name: string;
  phoneCode: string;
  provinces: ProvinceSeed[];
}

export const ZIMBABWE_SEED: CountrySeed = {
  iso2: 'ZW',
  name: 'Zimbabwe',
  phoneCode: '+263',
  provinces: [
    {
      name: 'Harare Metropolitan',
      cities: [
        {
          name: 'Harare',
          lat: -17.8292,
          lng: 31.0522,
          suburbs: [
            { name: 'Avondale', lat: -17.7833, lng: 31.0333 },
            { name: 'Avonlea', lat: -17.7780, lng: 31.0280 },
            { name: 'Belgravia', lat: -17.8200, lng: 31.0450 },
            { name: 'Belvedere', lat: -17.8350, lng: 31.0200 },
            { name: 'Bluff Hill', lat: -17.8100, lng: 31.0000 },
            { name: 'Borrowdale', lat: -17.7508, lng: 31.0984 },
            { name: 'Borrowdale Brooke', lat: -17.7450, lng: 31.1050 },
            { name: 'Budiriro', lat: -17.8800, lng: 30.9700 },
            { name: 'Chisipite', lat: -17.7950, lng: 31.1200 },
            { name: 'Eastlea', lat: -17.8250, lng: 31.0700 },
            { name: 'Emerald Hill', lat: -17.8350, lng: 31.0350 },
            { name: 'Glen Lorne', lat: -17.7600, lng: 31.1300 },
            { name: 'Glen Norah', lat: -17.8600, lng: 31.0000 },
            { name: 'Glen View', lat: -17.8750, lng: 30.9850 },
            { name: 'Greendale', lat: -17.8016, lng: 31.1278 },
            { name: 'Greystone Park', lat: -17.7700, lng: 31.0900 },
            { name: 'Gunhill', lat: -17.8000, lng: 31.0600 },
            { name: 'Hatfield', lat: -17.8200, lng: 31.0750 },
            { name: 'Helensvale', lat: -17.7600, lng: 31.0700 },
            { name: 'Highfield', lat: -17.8550, lng: 31.0150 },
            { name: 'Highlands', lat: -17.7839, lng: 31.1058 },
            { name: 'Hillside', lat: -17.8400, lng: 31.0550 },
            { name: 'Houghton Park', lat: -17.8680, lng: 31.0250 },
            { name: 'Kambuzuma', lat: -17.8600, lng: 30.9900 },
            { name: 'Kensington', lat: -17.8100, lng: 31.0800 },
            { name: 'Kopje', lat: -17.8300, lng: 31.0500 },
            { name: 'Kuwadzana', lat: -17.8650, lng: 30.9600 },
            { name: 'Lochinvar', lat: -17.8150, lng: 31.0100 },
            { name: 'Mabelreign', lat: -17.8000, lng: 31.0100 },
            { name: 'Mainway Meadows', lat: -17.8100, lng: 31.0050 },
            { name: 'Mandara', lat: -17.7850, lng: 31.1350 },
            { name: 'Marlborough', lat: -17.7650, lng: 31.0150 },
            { name: 'Mbare', lat: -17.8716, lng: 31.0397 },
            { name: 'Milton Park', lat: -17.8250, lng: 31.0400 },
            { name: 'Mount Pleasant', lat: -17.7700, lng: 31.0500 },
            { name: 'Msasa', lat: -17.7900, lng: 31.1100 },
            { name: 'Msasa Park', lat: -17.7950, lng: 31.1050 },
            { name: 'Mufakose', lat: -17.8650, lng: 30.9750 },
            { name: 'Newlands', lat: -17.8050, lng: 31.0750 },
            { name: 'Pomona', lat: -17.7800, lng: 31.0800 },
            { name: 'Queensdale', lat: -17.8150, lng: 31.0850 },
            { name: 'Rhodesville', lat: -17.8200, lng: 31.0650 },
            { name: 'Ridgeview', lat: -17.7750, lng: 31.0600 },
            { name: 'Ruwa', lat: -17.8845, lng: 31.244 },
            { name: 'Strathaven', lat: -17.8000, lng: 31.0200 },
            { name: 'Sunningdale', lat: -17.8100, lng: 31.0900 },
            { name: 'Sunridge', lat: -17.8050, lng: 31.0950 },
            { name: 'Tynwald', lat: -17.8100, lng: 30.9900 },
            { name: 'Vainona', lat: -17.7650, lng: 31.0850 },
            { name: 'Warren Park', lat: -17.8450, lng: 30.9950 },
            { name: 'Waterfalls', lat: -17.8500, lng: 31.0100 },
            { name: 'Westgate', lat: -17.8100, lng: 30.9850 }
          ]
        },
        {
          name: 'Chitungwiza',
          lat: -18.0127,
          lng: 31.0755,
          suburbs: [
            { name: 'Seke', lat: -18.0585, lng: 31.0584 },
            { name: "St Mary's", lat: -18.0204, lng: 31.051 },
            { name: 'Unit A', lat: -18.0100, lng: 31.0600 },
            { name: 'Unit B', lat: -18.0150, lng: 31.0650 },
            { name: 'Unit C', lat: -18.0200, lng: 31.0700 },
            { name: 'Unit D', lat: -18.0250, lng: 31.0750 },
            { name: 'Unit E', lat: -18.0300, lng: 31.0800 },
            { name: 'Unit F', lat: -18.0350, lng: 31.0850 },
            { name: 'Unit G', lat: -18.0400, lng: 31.0900 },
            { name: 'Unit H', lat: -18.0450, lng: 31.0950 },
            { name: 'Unit I', lat: -18.0500, lng: 31.1000 },
            { name: 'Unit J', lat: -18.0550, lng: 31.1050 },
            { name: 'Unit K', lat: -18.0600, lng: 31.1100 },
            { name: 'Unit L', lat: -18.0650, lng: 31.1150 },
            { name: 'Unit M', lat: -18.0700, lng: 31.1200 },
            { name: 'Unit N', lat: -18.0750, lng: 31.1250 },
            { name: 'Unit O', lat: -18.0800, lng: 31.1300 },
            { name: 'Unit P', lat: -18.0850, lng: 31.1350 },
            { name: 'Zengeza 1', lat: -18.0038, lng: 31.0813 },
            { name: 'Zengeza 2', lat: -18.0050, lng: 31.0830 },
            { name: 'Zengeza 3', lat: -18.0060, lng: 31.0850 },
            { name: 'Zengeza 4', lat: -18.0070, lng: 31.0870 },
            { name: 'Zengeza 5', lat: -18.0080, lng: 31.0890 }
          ]
        },
        {
          name: 'Epworth',
          lat: -17.8900,
          lng: 31.1400,
          suburbs: [
            { name: 'Epworth Main', lat: -17.8900, lng: 31.1400 },
            { name: 'Overspill', lat: -17.8950, lng: 31.1450 },
            { name: 'Domboramwari', lat: -17.8850, lng: 31.1350 }
          ]
        },
        {
          name: 'Norton',
          lat: -17.8833,
          lng: 30.7000,
          suburbs: [
            { name: 'Katanga', lat: -17.8800, lng: 30.6950 },
            { name: 'Ngoni', lat: -17.8850, lng: 30.7050 }
          ]
        }
      ]
    },
    {
      name: 'Bulawayo Metropolitan',
      cities: [
        {
          name: 'Bulawayo',
          lat: -20.1561,
          lng: 28.5833,
          suburbs: [
            { name: 'Ascot', lat: -20.1400, lng: 28.5800 },
            { name: 'Barham Green', lat: -20.1500, lng: 28.5600 },
            { name: 'Bellevue', lat: -20.1350, lng: 28.5900 },
            { name: 'Belmont', lat: -20.1300, lng: 28.5700 },
            { name: 'Bradfield', lat: -20.1700, lng: 28.5700 },
            { name: 'Burnside', lat: -20.1450, lng: 28.6000 },
            { name: 'Cowdray Park', lat: -20.2000, lng: 28.6100 },
            { name: 'Donnington', lat: -20.1800, lng: 28.5600 },
            { name: 'Douglasdale', lat: -20.1600, lng: 28.5500 },
            { name: 'Emakhandeni', lat: -20.2100, lng: 28.5900 },
            { name: 'Entumbane', lat: -20.2000, lng: 28.5800 },
            { name: 'Famona', lat: -20.1700, lng: 28.5800 },
            { name: 'Fourwinds', lat: -20.1250, lng: 28.5700 },
            { name: 'Greenhill', lat: -20.1500, lng: 28.5900 },
            { name: 'Hillside', lat: -20.1708, lng: 28.6065 },
            { name: 'Hyde Park', lat: -20.1600, lng: 28.5900 },
            { name: 'Killarney', lat: -20.1400, lng: 28.5650 },
            { name: 'Khumalo', lat: -20.1465, lng: 28.6008 },
            { name: 'Kumalo', lat: -20.1600, lng: 28.6000 },
            { name: 'Lobengula', lat: -20.1900, lng: 28.5500 },
            { name: 'Lochview', lat: -20.1350, lng: 28.5750 },
            { name: 'Luveve', lat: -20.2200, lng: 28.5600 },
            { name: 'Makokoba', lat: -20.1650, lng: 28.5750 },
            { name: 'Malindela', lat: -20.1850, lng: 28.5700 },
            { name: 'Matsheumhlope', lat: -20.1750, lng: 28.5800 },
            { name: 'Montrose', lat: -20.1700, lng: 28.5850 },
            { name: 'Morningside', lat: -20.1791, lng: 28.5912 },
            { name: 'Mpopoma', lat: -20.1950, lng: 28.5650 },
            { name: 'Nketa', lat: -20.2050, lng: 28.5700 },
            { name: 'Nkulumane', lat: -20.2100, lng: 28.5750 },
            { name: 'North End', lat: -20.1400, lng: 28.5750 },
            { name: 'Northlea', lat: -20.1350, lng: 28.5850 },
            { name: 'North Lynne', lat: -20.1250, lng: 28.5900 },
            { name: 'North Trenance', lat: -20.1400, lng: 28.5900 },
            { name: 'Nuffield', lat: -20.1300, lng: 28.5950 },
            { name: 'Paddonhurst', lat: -20.1350, lng: 28.6000 },
            { name: 'Parklands', lat: -20.1600, lng: 28.5750 },
            { name: 'Queens Park', lat: -20.1550, lng: 28.5800 },
            { name: 'Queenspark East', lat: -20.1580, lng: 28.5850 },
            { name: 'Rangemore', lat: -20.1450, lng: 28.5950 },
            { name: 'Richmond', lat: -20.1650, lng: 28.5950 },
            { name: 'Riverside', lat: -20.1450, lng: 28.5850 },
            { name: 'Selborne Park', lat: -20.1500, lng: 28.5700 },
            { name: 'Southdale', lat: -20.1800, lng: 28.5700 },
            { name: 'Southwold', lat: -20.1850, lng: 28.5750 },
            { name: 'Steeldale', lat: -20.1900, lng: 28.5650 },
            { name: 'Suburbs', lat: -20.1550, lng: 28.5850 },
            { name: 'Sunninghill', lat: -20.1650, lng: 28.6000 },
            { name: 'Thorngrove', lat: -20.1400, lng: 28.5800 },
            { name: 'Trenance', lat: -20.1380, lng: 28.5920 },
            { name: 'Waterford', lat: -20.1750, lng: 28.5950 },
            { name: 'Westgate', lat: -20.1600, lng: 28.5650 },
            { name: 'Willsgrove', lat: -20.1550, lng: 28.5600 },
            { name: 'Woodville', lat: -20.1500, lng: 28.5650 }
          ]
        }
      ]
    },
    {
      name: 'Manicaland',
      cities: [
        {
          name: 'Mutare',
          lat: -18.9707,
          lng: 32.6709,
          suburbs: [
            { name: 'Avenues', lat: -18.9670, lng: 32.6700 },
            { name: 'Chikanga', lat: -18.9850, lng: 32.6400 },
            { name: 'Dangamvura', lat: -19.0000, lng: 32.6600 },
            { name: 'Darlington', lat: -18.9644, lng: 32.7021 },
            { name: 'Fairbridge Park', lat: -18.9771, lng: 32.6481 },
            { name: 'Florida', lat: -18.9750, lng: 32.6550 },
            { name: 'Fern Valley', lat: -18.9600, lng: 32.6650 },
            { name: 'Greenside', lat: -18.9650, lng: 32.6800 },
            { name: 'Hobhouse', lat: -18.9700, lng: 32.6600 },
            { name: 'Morningside', lat: -18.9550, lng: 32.6700 },
            { name: 'Murambi', lat: -18.9800, lng: 32.6500 },
            { name: 'Palmerston', lat: -18.9600, lng: 32.6600 },
            { name: 'Sakubva', lat: -18.9951, lng: 32.6547 },
            { name: 'Tiger Kloof', lat: -18.9650, lng: 32.6550 },
            { name: 'Utopia', lat: -18.9580, lng: 32.6730 },
            { name: 'Westlea', lat: -18.9700, lng: 32.6450 },
            { name: 'Zimunya', lat: -19.0200, lng: 32.6200 }
          ]
        },
        {
          name: 'Rusape',
          lat: -18.5279,
          lng: 32.1284,
          suburbs: [
            { name: 'Vengere', lat: -18.5293, lng: 32.1395 },
            { name: 'Magamba', lat: -18.5079, lng: 32.1202 },
            { name: 'Rusape Town', lat: -18.5279, lng: 32.1284 }
          ]
        },
        {
          name: 'Chipinge',
          lat: -20.1893,
          lng: 32.6215,
          suburbs: [
            { name: 'Chipinge Town', lat: -20.1893, lng: 32.6215 }
          ]
        },
        {
          name: 'Nyanga',
          lat: -18.2167,
          lng: 32.75,
          suburbs: [
            { name: 'Nyanga Town', lat: -18.2167, lng: 32.75 }
          ]
        },
        {
          name: 'Penhalonga',
          lat: -18.8833,
          lng: 32.6833,
          suburbs: [
            { name: 'Penhalonga Town', lat: -18.8833, lng: 32.6833 }
          ]
        },
        {
          name: 'Chimanimani',
          lat: -19.8,
          lng: 32.8667,
          suburbs: [
            { name: 'Chimanimani Village', lat: -19.8, lng: 32.8667 }
          ]
        }
      ]
    },
    {
      name: 'Midlands',
      cities: [
        {
          name: 'Gweru',
          lat: -19.4506,
          lng: 29.8022,
          suburbs: [
            { name: 'Ascot', lat: -19.4450, lng: 29.8100 },
            { name: 'Ivene', lat: -19.4552, lng: 29.8268 },
            { name: 'Kopje', lat: -19.4575, lng: 29.7993 },
            { name: 'Mkoba', lat: -19.4700, lng: 29.7800 },
            { name: 'Mtapa', lat: -19.4600, lng: 29.8100 },
            { name: 'Ridgemont', lat: -19.4402, lng: 29.8184 },
            { name: 'Senga', lat: -19.4800, lng: 29.8200 },
            { name: 'Southdowns', lat: -19.4650, lng: 29.7900 },
            { name: 'Woodville', lat: -19.4350, lng: 29.8050 }
          ]
        },
        {
          name: 'Kwekwe',
          lat: -18.9281,
          lng: 29.8149,
          suburbs: [
            { name: 'Amaveni', lat: -18.9350, lng: 29.8200 },
            { name: 'Chicago', lat: -18.9445, lng: 29.8321 },
            { name: 'Fitchlea', lat: -18.9200, lng: 29.8100 },
            { name: 'Mbizo', lat: -18.9400, lng: 29.8000 },
            { name: 'Msasa Park', lat: -18.9111, lng: 29.8244 },
            { name: 'Newtown', lat: -18.9300, lng: 29.8150 }
          ]
        },
        {
          name: 'Zvishavane',
          lat: -20.3283,
          lng: 30.0553,
          suburbs: [
            { name: 'Mandava', lat: -20.3350, lng: 30.0600 },
            { name: 'Makwasha', lat: -20.3200, lng: 30.0500 }
          ]
        },
        {
          name: 'Shurugwi',
          lat: -19.6667,
          lng: 30.0167,
          suburbs: [
            { name: 'Shurugwi Town', lat: -19.6667, lng: 30.0167 }
          ]
        },
        {
          name: 'Redcliff',
          lat: -19.0333,
          lng: 29.7833,
          suburbs: [
            { name: 'Redcliff Town', lat: -19.0333, lng: 29.7833 },
            { name: 'Torwood', lat: -19.0400, lng: 29.7900 }
          ]
        },
        {
          name: 'Gokwe',
          lat: -18.2167,
          lng: 28.9333,
          suburbs: [
            { name: 'Gokwe Town', lat: -18.2167, lng: 28.9333 }
          ]
        },
        {
          name: 'Kadoma',
          lat: -18.3333,
          lng: 29.9167,
          suburbs: [
            { name: 'Kadoma CBD', lat: -18.3333, lng: 29.9167 },
            { name: 'Rimuka', lat: -18.3400, lng: 29.9000 },
            { name: 'Ngezi', lat: -18.3200, lng: 29.9300 }
          ]
        }
      ]
    },
    {
      name: 'Masvingo',
      cities: [
        {
          name: 'Masvingo',
          lat: -20.0744,
          lng: 30.8327,
          suburbs: [
            { name: 'Bushman Way', lat: -20.0650, lng: 30.8250 },
            { name: 'Clipsham', lat: -20.0700, lng: 30.8200 },
            { name: 'Eastvale', lat: -20.0636, lng: 30.8191 },
            { name: 'Hillside', lat: -20.0680, lng: 30.8350 },
            { name: 'Mucheke', lat: -20.0875, lng: 30.8348 },
            { name: 'Rhodene', lat: -20.0600, lng: 30.8300 },
            { name: 'Rujeko', lat: -20.0607, lng: 30.8406 },
            { name: 'Target Kopje', lat: -20.0650, lng: 30.8400 }
          ]
        },
        {
          name: 'Chiredzi',
          lat: -21.05,
          lng: 31.6667,
          suburbs: [
            { name: 'Chishamiso', lat: -21.0435, lng: 31.6712 },
            { name: 'Lowveld Heights', lat: -21.0418, lng: 31.651 },
            { name: 'Tshovani', lat: -21.0600, lng: 31.6800 }
          ]
        },
        {
          name: 'Triangle',
          lat: -21.0333,
          lng: 31.4833,
          suburbs: [
            { name: 'Triangle Estates', lat: -21.0333, lng: 31.4833 }
          ]
        },
        {
          name: 'Gutu',
          lat: -19.9167,
          lng: 31.0,
          suburbs: [
            { name: 'Gutu Town', lat: -19.9167, lng: 31.0 }
          ]
        }
      ]
    },
    {
      name: 'Matabeleland North',
      cities: [
        {
          name: 'Victoria Falls',
          lat: -17.9243,
          lng: 25.8567,
          suburbs: [
            { name: 'Aerodrome', lat: -17.9300, lng: 25.8400 },
            { name: 'Chinotimba', lat: -17.9315, lng: 25.8371 },
            { name: 'Mkhosana', lat: -17.9167, lng: 25.8584 },
            { name: 'Victoria Falls CBD', lat: -17.9243, lng: 25.8567 }
          ]
        },
        {
          name: 'Hwange',
          lat: -18.3646,
          lng: 26.4988,
          suburbs: [
            { name: 'Empumalanga', lat: -18.3700, lng: 26.5050 },
            { name: 'Hwange Town', lat: -18.3646, lng: 26.4988 },
            { name: 'Lwendulu', lat: -18.3737, lng: 26.5006 }
          ]
        },
        {
          name: 'Lupane',
          lat: -18.9333,
          lng: 27.8,
          suburbs: [
            { name: 'Lupane Town', lat: -18.9333, lng: 27.8 }
          ]
        },
        {
          name: 'Binga',
          lat: -17.6167,
          lng: 27.3333,
          suburbs: [
            { name: 'Binga Town', lat: -17.6167, lng: 27.3333 }
          ]
        }
      ]
    },
    {
      name: 'Matabeleland South',
      cities: [
        {
          name: 'Gwanda',
          lat: -20.9333,
          lng: 29,
          suburbs: [
            { name: 'Green Valley', lat: -20.9251, lng: 29.0196 },
            { name: 'Gwanda Town', lat: -20.9333, lng: 29.0 },
            { name: 'Jacaranda', lat: -20.9345, lng: 29.0128 },
            { name: 'Phakama', lat: -20.9400, lng: 29.0100 }
          ]
        },
        {
          name: 'Beitbridge',
          lat: -22.2167,
          lng: 30,
          suburbs: [
            { name: 'Beitbridge CBD', lat: -22.2167, lng: 30.0 },
            { name: 'Dulivhadzimu', lat: -22.2187, lng: 30.0052 },
            { name: 'Medium Density', lat: -22.2199, lng: 29.9974 }
          ]
        },
        {
          name: 'Plumtree',
          lat: -20.4833,
          lng: 27.8167,
          suburbs: [
            { name: 'Plumtree Town', lat: -20.4833, lng: 27.8167 }
          ]
        },
        {
          name: 'Filabusi',
          lat: -20.5333,
          lng: 29.2833,
          suburbs: [
            { name: 'Filabusi Town', lat: -20.5333, lng: 29.2833 }
          ]
        }
      ]
    },
    {
      name: 'Mashonaland Central',
      cities: [
        {
          name: 'Bindura',
          lat: -17.3008,
          lng: 31.3304,
          suburbs: [
            { name: 'Aerodrome', lat: -17.2900, lng: 31.3200 },
            { name: 'Bindura Town', lat: -17.3008, lng: 31.3304 },
            { name: 'Chipadze', lat: -17.2975, lng: 31.3244 },
            { name: 'Chiwaridzo', lat: -17.3078, lng: 31.3299 },
            { name: 'Hospital', lat: -17.3050, lng: 31.3350 }
          ]
        },
        {
          name: 'Concession',
          lat: -17.4044,
          lng: 30.9486,
          suburbs: [
            { name: 'Concession Town', lat: -17.4044, lng: 30.9486 }
          ]
        },
        {
          name: 'Mazowe',
          lat: -17.5068,
          lng: 30.9677,
          suburbs: [
            { name: 'Mazowe Town', lat: -17.5068, lng: 30.9677 }
          ]
        },
        {
          name: 'Shamva',
          lat: -17.3167,
          lng: 31.5667,
          suburbs: [
            { name: 'Shamva Town', lat: -17.3167, lng: 31.5667 },
            { name: 'Wadzanai', lat: -17.3200, lng: 31.5700 }
          ]
        },
        {
          name: 'Mount Darwin',
          lat: -16.7667,
          lng: 31.5833,
          suburbs: [
            { name: 'Mount Darwin Town', lat: -16.7667, lng: 31.5833 }
          ]
        },
        {
          name: 'Centenary',
          lat: -16.7333,
          lng: 31.1167,
          suburbs: [
            { name: 'Centenary Town', lat: -16.7333, lng: 31.1167 }
          ]
        },
        {
          name: 'Guruve',
          lat: -16.65,
          lng: 30.7,
          suburbs: [
            { name: 'Guruve Town', lat: -16.65, lng: 30.7 }
          ]
        },
        {
          name: 'Mvurwi',
          lat: -17.0333,
          lng: 30.8667,
          suburbs: [
            { name: 'Mvurwi Town', lat: -17.0333, lng: 30.8667 }
          ]
        }
      ]
    },
    {
      name: 'Mashonaland East',
      cities: [
        {
          name: 'Marondera',
          lat: -18.1853,
          lng: 31.5519,
          suburbs: [
            { name: 'Cherutombo', lat: -18.1900, lng: 31.5600 },
            { name: 'Dombotombo', lat: -18.1884, lng: 31.5599 },
            { name: 'Garikai', lat: -18.1950, lng: 31.5650 },
            { name: 'Marondera CBD', lat: -18.1853, lng: 31.5519 },
            { name: 'Windsor Park', lat: -18.1906, lng: 31.5514 }
          ]
        },
        {
          name: 'Ruwa',
          lat: -17.8845,
          lng: 31.244,
          suburbs: [
            { name: 'Chipukutu', lat: -17.8900, lng: 31.2500 },
            { name: 'Damofalls', lat: -17.8858, lng: 31.2636 },
            { name: 'Fairview', lat: -17.8766, lng: 31.2314 },
            { name: 'Ruwa Town Centre', lat: -17.8845, lng: 31.244 },
            { name: 'Springvale', lat: -17.8800, lng: 31.2400 },
            { name: 'Zimre Park', lat: -17.8750, lng: 31.2350 }
          ]
        },
        {
          name: 'Mutoko',
          lat: -17.3833,
          lng: 32.2167,
          suburbs: [
            { name: 'Mutoko Town', lat: -17.3833, lng: 32.2167 }
          ]
        },
        {
          name: 'Murewa',
          lat: -17.65,
          lng: 31.7833,
          suburbs: [
            { name: 'Murewa Town', lat: -17.65, lng: 31.7833 }
          ]
        },
        {
          name: 'Macheke',
          lat: -18.15,
          lng: 31.9,
          suburbs: [
            { name: 'Macheke Town', lat: -18.15, lng: 31.9 }
          ]
        },
        {
          name: 'Goromonzi',
          lat: -17.9,
          lng: 31.4,
          suburbs: [
            { name: 'Goromonzi Town', lat: -17.9, lng: 31.4 }
          ]
        },
        {
          name: 'Wedza',
          lat: -18.6,
          lng: 31.5833,
          suburbs: [
            { name: 'Wedza Town', lat: -18.6, lng: 31.5833 }
          ]
        }
      ]
    },
    {
      name: 'Mashonaland West',
      cities: [
        {
          name: 'Chinhoyi',
          lat: -17.3667,
          lng: 30.2,
          suburbs: [
            { name: 'Brundish', lat: -17.3600, lng: 30.2100 },
            { name: 'Chinhoyi CBD', lat: -17.3667, lng: 30.2 },
            { name: 'Chikonohono', lat: -17.3721, lng: 30.2033 },
            { name: 'Cold Comfort', lat: -17.3550, lng: 30.2050 },
            { name: 'Gadzema', lat: -17.3593, lng: 30.1971 },
            { name: 'Hunyani', lat: -17.3700, lng: 30.1900 },
            { name: 'Orange Grove', lat: -17.3650, lng: 30.2150 }
          ]
        },
        {
          name: 'Kariba',
          lat: -16.5167,
          lng: 28.8,
          suburbs: [
            { name: 'Heights', lat: -16.5100, lng: 28.7950 },
            { name: 'Kariba CBD', lat: -16.5167, lng: 28.8 },
            { name: 'Mahombekombe', lat: -16.5219, lng: 28.7983 },
            { name: 'Nyamhunga', lat: -16.5131, lng: 28.7721 }
          ]
        },
        {
          name: 'Karoi',
          lat: -16.8167,
          lng: 29.6833,
          suburbs: [
            { name: 'Chikangwe', lat: -16.8200, lng: 29.6900 },
            { name: 'Karoi CBD', lat: -16.8167, lng: 29.6833 }
          ]
        },
        {
          name: 'Chegutu',
          lat: -18.1333,
          lng: 30.1333,
          suburbs: [
            { name: 'Chegutu CBD', lat: -18.1333, lng: 30.1333 },
            { name: 'Pfupajena', lat: -18.1400, lng: 30.1400 }
          ]
        },
        {
          name: 'Banket',
          lat: -17.3833,
          lng: 30.4,
          suburbs: [
            { name: 'Banket Town', lat: -17.3833, lng: 30.4 }
          ]
        },
        {
          name: 'Sanyati',
          lat: -17.9833,
          lng: 29.2167,
          suburbs: [
            { name: 'Sanyati Town', lat: -17.9833, lng: 29.2167 }
          ]
        },
        {
          name: 'Mhangura',
          lat: -16.8833,
          lng: 30.1333,
          suburbs: [
            { name: 'Mhangura Town', lat: -16.8833, lng: 30.1333 }
          ]
        },
        {
          name: 'Makonde',
          lat: -17.35,
          lng: 30.1167,
          suburbs: [
            { name: 'Makonde Town', lat: -17.35, lng: 30.1167 }
          ]
        }
      ]
    }
  ]
};
