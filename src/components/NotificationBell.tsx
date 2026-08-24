import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { api, type Notification } from '../api/client'

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  function loadUnreadCount() {
    api.getUnreadNotificationCount(token).then((r) => setUnreadCount(r.count)).catch(() => {})
  }

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open) {
      const list = await api.getNotifications(token)
      setNotifications(list)
    }
  }

  async function handleMarkRead(n: Notification) {
    if (n.read_at) return
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await api.markNotificationRead(token, n.id)
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
    setUnreadCount(0)
    try {
      await api.markAllNotificationsRead(token)
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-600 hover:bg-ink-50"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-ink-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-bold text-ink-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`block w-full border-b border-ink-50 px-4 py-3 text-left last:border-0 hover:bg-ink-50 ${
                    !n.read_at ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-ink-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
