export type LatLngTuple = [number, number];

export interface RawSuburb {
  name: string;
  city: string;
  polygon: LatLngTuple[];
}

export const SUBURBS: RawSuburb[] = [
  {
    name: 'Borrowdale',
    city: 'Harare',
    polygon: [
      [-17.731, 31.053],
      [-17.731, 31.112],
      [-17.785, 31.112],
      [-17.785, 31.053],
      [-17.731, 31.053]
    ]
  },
  {
    name: 'Greendale',
    city: 'Harare',
    polygon: [
      [-17.793, 31.094],
      [-17.793, 31.146],
      [-17.844, 31.146],
      [-17.844, 31.094],
      [-17.793, 31.094]
    ]
  },
  {
    name: 'Avondale',
    city: 'Harare',
    polygon: [
      [-17.782, 31.016],
      [-17.782, 31.052],
      [-17.812, 31.052],
      [-17.812, 31.016],
      [-17.782, 31.016]
    ]
  },
  {
    name: 'Chitungwiza',
    city: 'Chitungwiza',
    polygon: [
      [-18.001, 31.028],
      [-18.001, 31.111],
      [-18.084, 31.111],
      [-18.084, 31.028],
      [-18.001, 31.028]
    ]
  }
];
