import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import AppRouter from '@/routes/AppRouter'

/**
 * Root application component.
 * Provider order matters:
 *   AuthProvider  — must wrap everything (NotificationProvider needs auth state)
 *   NotificationProvider — needs auth to fetch notifications
 *   AppRouter — needs both contexts
 */
export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </AuthProvider>
  )
}
