import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GhostCDN - Image Viewer',
  description: 'View and share images hosted on GhostCDN',
}

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0f0f19]">
      {children}
    </div>
  )
} 