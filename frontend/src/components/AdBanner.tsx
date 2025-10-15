import { useEffect } from 'react'

interface Props {
  slot: string
}

export const AdBanner = ({ slot }: Props) => {
  useEffect(() => {
    if (window) {
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
    }
  }, [])

  return (
    <ins
      className="adsbygoogle block w-full"
      style={{ display: 'block', minHeight: 90 }}
      data-ad-client={import.meta.env.VITE_GOOGLE_ADS_CLIENT ?? 'ca-pub-xxxxxxxxxxxx'}
      data-ad-slot={slot}
      data-ad-format="auto"
    ></ins>
  )
}
