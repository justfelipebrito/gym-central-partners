import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfessional } from '@/hooks/useProfessional'
import { colors, radius } from '@/lib/theme'
import './AppLayout.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/requests', label: 'Requests', icon: '📥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const roleLabel: Record<string, string> = {
  pt: 'Personal Trainer',
  nutritionist: 'Nutritionist',
  cook: 'Cook',
}

const roleEmoji: Record<string, string> = {
  pt: '🏋️',
  nutritionist: '🥗',
  cook: '👨‍🍳',
}

export function AppLayout() {
  const { signOut } = useAuth()
  const { professional, role } = useProfessional()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="app-shell" style={styles.shell}>
      <nav className="app-sidebar" style={styles.sidebar}>
        {/* Brand */}
        <div className="app-brand" style={styles.brand}>
          <div style={styles.brandMark}>GC</div>
          <div>
            <div style={styles.brandName}>Partners</div>
            {role && (
              <div style={styles.roleTag}>
                {roleEmoji[role]} {roleLabel[role] ?? role}
              </div>
            )}
          </div>
        </div>

        {/* Nav links */}
        <ul className="app-nav-list" style={styles.navList}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="app-nav-link"
                style={({ isActive }) => ({
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                })}
              >
                <span className="app-nav-icon" style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="app-sidebar-footer" style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {professional?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{professional?.displayName}</div>
              <div style={styles.userRole}>{roleLabel[role ?? ''] ?? ''}</div>
            </div>
          </div>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="app-content" style={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  sidebar: {
    width: 232,
    background: colors.sidebar,
    color: '#F5F5F4',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    gap: 4,
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 8px 20px',
    borderBottom: `1px solid #292524`,
    marginBottom: 8,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    background: colors.primary,
    color: colors.primaryText,
    fontWeight: 900,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    letterSpacing: '-0.02em',
  },
  brandName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#F5F5F4',
    letterSpacing: '-0.01em',
  },
  roleTag: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 1,
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: radius.md,
    color: '#A8A29E',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: colors.sidebarActive,
    color: colors.primary,
  },
  navIcon: {
    fontSize: 14,
    width: 18,
    textAlign: 'center' as const,
  },
  sidebarFooter: {
    borderTop: '1px solid #292524',
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 8px',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    background: colors.primary,
    color: colors.primaryText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  userInfo: {
    overflow: 'hidden',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#E7E5E4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 1,
  },
  signOutBtn: {
    background: 'none',
    border: '1px solid #292524',
    borderRadius: radius.md,
    color: '#78716C',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 32,
    background: colors.bg,
    overflow: 'auto',
  },
}
