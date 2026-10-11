import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Experiments } from './pages/Experiments'
import { NewTask } from './pages/NewTask'
import { Report } from './pages/Report'
import { RepoDetail } from './pages/RepoDetail'
import { Repositories } from './pages/Repositories'
import { Settings } from './pages/Settings'
import { TaskDetail } from './pages/TaskDetail'
import { TaskHistory } from './pages/TaskHistory'
import { RepoPilotProvider } from './store'
import { ThemeProvider } from './theme'

export default function App() {
  return (
    <ThemeProvider>
      <RepoPilotProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="tasks/new" element={<NewTask />} />
              <Route path="tasks" element={<TaskHistory />} />
              <Route path="tasks/:taskId" element={<TaskDetail />} />
              <Route path="tasks/:taskId/report" element={<Report />} />
              <Route path="repos" element={<Repositories />} />
              <Route path="repos/:repoId" element={<RepoDetail />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RepoPilotProvider>
    </ThemeProvider>
  )
}
