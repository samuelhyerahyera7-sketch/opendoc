import { User } from 'lucide-react'

export default function DoctorAvatar({
  photo,
  name,
  className = '',
  iconSize = 20,
}: {
  photo?: string | null
  name: string
  className?: string
  iconSize?: number
}) {
  if (photo) {
    return <img src={photo} alt={name} className={className} />
  }
  return (
    <span className={`flex items-center justify-center bg-ink-100 text-ink-400 ${className}`}>
      <User size={iconSize} />
    </span>
  )
}
