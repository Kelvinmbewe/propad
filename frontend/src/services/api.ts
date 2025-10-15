import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
})

export interface Listing {
  id: number
  title: string
  description: string
  price: number
  currency: string
  location_city: string
  location_area: string
  bedrooms?: number | null
  bathrooms?: number | null
  listing_purpose: 'rent' | 'sale' | 'lease'
  property_type: string
  media_items: { id: number; url: string }[]
  tags: string[]
  amenities: string[]
  created_at: string
  status: string
}

export const fetchListings = async (): Promise<Listing[]> => {
  const response = await apiClient.get<Listing[]>('/listings', {
    params: { limit: 12 }
  })
  return response.data
}

export interface Announcement {
  id: number
  title: string
  body: string
}
