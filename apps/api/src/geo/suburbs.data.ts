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
            { name: 'Borrowdale', lat: -17.7508, lng: 31.0984 },
            { name: 'Avondale', lat: -17.7833, lng: 31.0333 },
            { name: 'Greendale', lat: -17.8016, lng: 31.1278 },
            { name: 'Highlands', lat: -17.7839, lng: 31.1058 },
            { name: 'Mbare', lat: -17.8716, lng: 31.0397 }
          ]
        },
        {
          name: 'Chitungwiza',
          lat: -18.0127,
          lng: 31.0755,
          suburbs: [
            { name: 'Zengeza', lat: -18.0038, lng: 31.0813 },
            { name: 'Seke', lat: -18.0585, lng: 31.0584 },
            { name: "St Mary's", lat: -18.0204, lng: 31.051 }
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
            { name: 'Khumalo', lat: -20.1465, lng: 28.6008 },
            { name: 'Morningside', lat: -20.1791, lng: 28.5912 },
            { name: 'Hillside', lat: -20.1708, lng: 28.6065 }
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
            { name: 'Fairbridge Park', lat: -18.9771, lng: 32.6481 },
            { name: 'Darlington', lat: -18.9644, lng: 32.7021 },
            { name: 'Sakubva', lat: -18.9951, lng: 32.6547 }
          ]
        },
        {
          name: 'Rusape',
          lat: -18.5279,
          lng: 32.1284,
          suburbs: [
            { name: 'Vengere', lat: -18.5293, lng: 32.1395 },
            { name: 'Magamba', lat: -18.5079, lng: 32.1202 }
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
            { name: 'Kopje', lat: -19.4575, lng: 29.7993 },
            { name: 'Ivene', lat: -19.4552, lng: 29.8268 },
            { name: 'Ridgemont', lat: -19.4402, lng: 29.8184 }
          ]
        },
        {
          name: 'Kwekwe',
          lat: -18.9281,
          lng: 29.8149,
          suburbs: [
            { name: 'Chicago', lat: -18.9445, lng: 29.8321 },
            { name: 'Msasa Park', lat: -18.9111, lng: 29.8244 }
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
            { name: 'Mucheke', lat: -20.0875, lng: 30.8348 },
            { name: 'Rujeko', lat: -20.0607, lng: 30.8406 },
            { name: 'Eastvale', lat: -20.0636, lng: 30.8191 }
          ]
        },
        {
          name: 'Chiredzi',
          lat: -21.05,
          lng: 31.6667,
          suburbs: [
            { name: 'Lowveld Heights', lat: -21.0418, lng: 31.651 },
            { name: 'Chishamiso', lat: -21.0435, lng: 31.6712 }
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
            { name: 'Chinotimba', lat: -17.9315, lng: 25.8371 },
            { name: 'Mkhosana', lat: -17.9167, lng: 25.8584 }
          ]
        },
        {
          name: 'Hwange',
          lat: -18.3646,
          lng: 26.4988,
          suburbs: [
            { name: 'Lwendulu', lat: -18.3737, lng: 26.5006 }
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
            { name: 'Jacaranda', lat: -20.9345, lng: 29.0128 },
            { name: 'Green Valley', lat: -20.9251, lng: 29.0196 }
          ]
        },
        {
          name: 'Beitbridge',
          lat: -22.2167,
          lng: 30,
          suburbs: [
            { name: 'Dulivhadzimu', lat: -22.2187, lng: 30.0052 },
            { name: 'Medium Density', lat: -22.2199, lng: 29.9974 }
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
            { name: 'Chiwaridzo', lat: -17.3078, lng: 31.3299 },
            { name: 'Chipadze', lat: -17.2975, lng: 31.3244 }
          ]
        },
        {
          name: 'Mazowe',
          lat: -17.5068,
          lng: 30.9677,
          suburbs: [
            { name: 'Concession', lat: -17.4044, lng: 30.9486 }
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
            { name: 'Windsor Park', lat: -18.1906, lng: 31.5514 },
            { name: 'Dombotombo', lat: -18.1884, lng: 31.5599 }
          ]
        },
        {
          name: 'Ruwa',
          lat: -17.8845,
          lng: 31.244,
          suburbs: [
            { name: 'Fairview', lat: -17.8766, lng: 31.2314 },
            { name: 'Damofalls', lat: -17.8858, lng: 31.2636 }
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
            { name: 'Chikonohono', lat: -17.3721, lng: 30.2033 },
            { name: 'Gadzema', lat: -17.3593, lng: 30.1971 }
          ]
        },
        {
          name: 'Kariba',
          lat: -16.5167,
          lng: 28.8,
          suburbs: [
            { name: 'Nyamhunga', lat: -16.5131, lng: 28.7721 },
            { name: 'Mahombekombe', lat: -16.5219, lng: 28.7983 }
          ]
        }
      ]
    }
  ]
};
